import httpx
from datetime import datetime, timedelta
import pytz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.models.asset import Asset
from src.models.quote import Quote
from src.core.config import settings

SAO_PAULO_TZ = pytz.timezone("America/Sao_Paulo")

def get_now_sp():
    return datetime.now(SAO_PAULO_TZ)

async def _upsert_quote(session: AsyncSession, asset_id: int, price: float, timestamp: datetime, source: str = 'legacy'):
    # Idempotent insert
    stmt = insert(Quote).values(
        asset_id=asset_id,
        price=price,
        timestamp=timestamp,
        source=source
    )
    stmt = stmt.on_conflict_do_nothing(
        index_elements=['asset_id', 'timestamp']
    )
    await session.execute(stmt)

async def _update_asset_metadata(session: AsyncSession, symbol: str, price: float, now: datetime, previous_close_price: float = None):
    stmt = select(Asset).where(Asset.symbol == symbol)
    result = await session.execute(stmt)
    asset = result.scalar_one_or_none()
    if asset:
        asset.current_price = str(price)
        asset.last_checked_at = now
        if previous_close_price is not None:
            asset.previous_close_price = str(previous_close_price)
    return asset

async def fetch_bcb_currencies(session: AsyncSession):
    now = get_now_sp()
    # BCB Olinda API doesn't require a token
    # Get today's or previous business day's quote
    # Due to API structure, we can just query the last 5 days and pick the latest one
    
    # Format: MM-DD-YYYY
    start_date = (now - timedelta(days=5)).strftime("%m-%d-%Y")
    end_date = now.strftime("%m-%d-%Y")
    
    async with httpx.AsyncClient() as client:
        # BCB Currencies
        currencies = [
            ("USD", "USD/BRL"), 
            ("EUR", "EUR/BRL"), 
            ("GBP", "GBP/BRL"), 
            ("JPY", "JPY/BRL")
        ]
        
        for currency, name in currencies:
            url = f"https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='{currency}'&@dataInicial='{start_date}'&@dataFinalCotacao='{end_date}'&$top=5&$orderby=dataHoraCotacao%20desc&$format=json"
            
            try:
                resp = await client.get(url, timeout=10.0)
                data = resp.json()
                if data and "value" in data and len(data["value"]) > 0:
                    latest = data["value"][0]
                    price = latest["cotacaoVenda"]
                    
                    previous_price = None
                    if len(data["value"]) > 1:
                        previous_price = data["value"][1]["cotacaoVenda"]
                    else:
                        previous_price = price # fallback
                    
                    # Ensure asset exists
                    stmt = select(Asset).where(Asset.symbol == currency)
                    asset = (await session.execute(stmt)).scalar_one_or_none()
                    if not asset:
                        asset = Asset(symbol=currency, name=name, type="CURRENCY")
                        session.add(asset)
                        await session.flush()
                    
                    # Use the precise time from BCB
                    bcb_time = datetime.strptime(latest["dataHoraCotacao"], "%Y-%m-%d %H:%M:%S.%f")
                    bcb_time = SAO_PAULO_TZ.localize(bcb_time)
                    
                    await _upsert_quote(session, asset.asset_id, price, bcb_time, source='bcb')
                    await _update_asset_metadata(session, currency, price, now, previous_close_price=previous_price)
            except Exception:
                print(f"BCB quote fetch failed for {currency}.")

async def fetch_brapi_assets(session: AsyncSession):
    now = get_now_sp()
    token = settings.BRAPI_TOKEN
    if not token:
        print("No BRAPI token configured")
        return

    async with httpx.AsyncClient() as client:
        # Fetch Stocks
        stocks = [("PETR4", "Petrobras PN"), ("VALE3", "Vale ON"), ("ITUB4", "Itaú Unibanco")]
        for symbol, name in stocks:
            url_stock = f"https://brapi.dev/api/quote/{symbol}?token={token}"
            try:
                resp = await client.get(url_stock, timeout=10.0)
                data = resp.json()
                if "results" in data and len(data["results"]) > 0:
                    result = data["results"][0]
                    price = result.get("regularMarketPrice")
                    prev_close = result.get("regularMarketPreviousClose")
                    timestamp_str = result.get("regularMarketTime") # ISO format UTC
                    
                    if price and timestamp_str:
                        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        
                        stmt = select(Asset).where(Asset.symbol == symbol)
                        asset = (await session.execute(stmt)).scalar_one_or_none()
                        if not asset:
                            asset = Asset(symbol=symbol, name=name, type="STOCK")
                            session.add(asset)
                            await session.flush()
                        
                        await _upsert_quote(session, asset.asset_id, price, dt, source='brapi')
                        await _update_asset_metadata(session, symbol, price, now, previous_close_price=prev_close)
            except Exception:
                print(f"Market quote fetch failed for {symbol}.")

        # Fetch Cryptos via Binance (Free, no token), fallback to CoinGecko
        cryptos = [
            ("BTC", "Bitcoin", "BTCBRL", "bitcoin"), 
            ("ETH", "Ethereum", "ETHBRL", "ethereum"), 
            ("SOL", "Solana", "SOLBRL", "solana")
        ]
        
        for symbol, name, binance_pair, cg_id in cryptos:
            price = None
            source = "binance"
            try:
                url_crypto = f"https://api.binance.com/api/v3/ticker/price?symbol={binance_pair}"
                resp = await client.get(url_crypto, timeout=10.0)
                if resp.status_code in (403, 451):
                    raise Exception("Binance geoblock/rate-limit")
                resp.raise_for_status()
                data = resp.json()
                if "price" in data:
                    price = float(data["price"])
            except Exception:
                print(f"Binance unavailable for {symbol}; trying CoinGecko.")
                source = "coingecko"
                try:
                    url_cg = f"https://api.coingecko.com/api/v3/simple/price?ids={cg_id}&vs_currencies=brl"
                    resp_cg = await client.get(url_cg, timeout=10.0)
                    resp_cg.raise_for_status()
                    data_cg = resp_cg.json()
                    if cg_id in data_cg and "brl" in data_cg[cg_id]:
                        price = float(data_cg[cg_id]["brl"])
                except Exception:
                    print(f"CoinGecko quote fetch failed for {symbol}.")
            
            if price is not None:
                dt = now
                
                stmt = select(Asset).where(Asset.symbol == symbol)
                asset = (await session.execute(stmt)).scalar_one_or_none()
                if not asset:
                    asset = Asset(symbol=symbol, name=name, type="CRYPTO")
                    session.add(asset)
                    await session.flush()
                    
                await _upsert_quote(session, asset.asset_id, price, dt, source=source)
                await _update_asset_metadata(session, symbol, price, now)

async def perform_sync(session: AsyncSession):
    await fetch_bcb_currencies(session)
    await fetch_brapi_assets(session)
    await session.commit()
