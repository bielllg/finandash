import asyncio
import httpx
from datetime import datetime, timedelta
import pytz
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.core.database import AsyncSessionLocal
from src.db.session import engine, Base
from src.models.asset import Asset
from src.models.quote import Quote
from src.core.config import settings

SAO_PAULO_TZ = pytz.timezone("America/Sao_Paulo")

async def get_or_create_asset(session: AsyncSession, symbol: str, name: str, type_str: str):
    stmt = select(Asset).where(Asset.symbol == symbol)
    asset = (await session.execute(stmt)).scalar_one_or_none()
    if not asset:
        asset = Asset(symbol=symbol, name=name, type=type_str)
        session.add(asset)
        await session.flush()
    return asset

async def backfill_bcb(session):
    # backfill 365 days
    end_date_dt = datetime.now(SAO_PAULO_TZ)
    start_date_dt = end_date_dt - timedelta(days=365)
    start_date = start_date_dt.strftime("%m-%d-%Y")
    end_date = end_date_dt.strftime("%m-%d-%Y")
    
    currencies = [
        ("USD", "Dólar Americano"),
        ("EUR", "Euro"),
        ("GBP", "Libra Esterlina"),
        ("JPY", "Iene Japonês")
    ]
    
    async with httpx.AsyncClient() as client:
        for currency, name in currencies:
            asset = await get_or_create_asset(session, currency, name, "CURRENCY")
            url = f"https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@moeda='{currency}'&@dataInicial='{start_date}'&@dataFinalCotacao='{end_date}'&$top=1000&$orderby=dataHoraCotacao%20desc&$format=json"
            
            try:
                resp = await client.get(url, timeout=20.0)
                data = resp.json()
                if "value" in data:
                    for item in data["value"]:
                        price = item["cotacaoVenda"]
                        bcb_time_str = item["dataHoraCotacao"]
                        bcb_time = datetime.strptime(bcb_time_str, "%Y-%m-%d %H:%M:%S.%f")
                        bcb_time = SAO_PAULO_TZ.localize(bcb_time)
                        
                        stmt = insert(Quote).values(asset_id=asset.asset_id, price=price, timestamp=bcb_time)
                        stmt = stmt.on_conflict_do_nothing(index_elements=['asset_id', 'timestamp'])
                        await session.execute(stmt)
            except Exception as e:
                print(f"Failed BCB backfill for {currency}: {e}")

async def backfill_brapi(session):
    token = settings.BRAPI_TOKEN
    if not token:
        print("No BRAPI token for backfill")
        return
        
    async with httpx.AsyncClient() as client:
        # Stocks
        stocks = [("PETR4", "Petrobras PN"), ("VALE3", "Vale ON"), ("ITUB4", "Itaú Unibanco")]
        for symbol, name in stocks:
            asset_stock = await get_or_create_asset(session, symbol, name, "STOCK")
            url_stock = f"https://brapi.dev/api/quote/{symbol}?range=1y&interval=1d&token={token}"
            try:
                resp = await client.get(url_stock, timeout=20.0)
                data = resp.json()
                if "results" in data:
                    historical = data["results"][0].get("historicalDataPrice", [])
                    for item in historical:
                        price = item.get("close")
                        ts = item.get("date")
                        if price and ts:
                            dt = datetime.fromtimestamp(ts, tz=pytz.utc)
                            stmt = insert(Quote).values(asset_id=asset_stock.asset_id, price=price, timestamp=dt)
                            stmt = stmt.on_conflict_do_nothing(index_elements=['asset_id', 'timestamp'])
                            await session.execute(stmt)
            except Exception as e:
                print(f"Failed Brapi backfill for {symbol}: {e}")
            
        # Crypto via Binance
        cryptos = [("BTC", "Bitcoin", "BTCBRL"), ("ETH", "Ethereum", "ETHBRL"), ("SOL", "Solana", "SOLBRL")]
        for symbol, name, binance_pair in cryptos:
            asset_crypto = await get_or_create_asset(session, symbol, name, "CRYPTO")
            url_crypto = f"https://api.binance.com/api/v3/klines?symbol={binance_pair}&interval=1d&limit=365"
            try:
                resp = await client.get(url_crypto, timeout=20.0)
                data = resp.json()
                if isinstance(data, list):
                    for kline in data:
                        ts = kline[0] # Open time
                        price = float(kline[4]) # Close price
                        dt = datetime.fromtimestamp(ts / 1000, tz=pytz.utc)
                        stmt = insert(Quote).values(asset_id=asset_crypto.asset_id, price=price, timestamp=dt)
                        stmt = stmt.on_conflict_do_nothing(index_elements=['asset_id', 'timestamp'])
                        await session.execute(stmt)
            except Exception as e:
                print(f"Failed Binance backfill for {symbol}: {e}")


async def main():
    async with AsyncSessionLocal() as session:
        await backfill_bcb(session)
        await backfill_brapi(session)
        await session.commit()

if __name__ == "__main__":
    asyncio.run(main())
