from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from typing import List
from datetime import datetime, timedelta
import pytz
import secrets

from src.core.config import settings
from src.core.database import get_db
from src.models.asset import Asset
from src.models.quote import Quote
from src.schemas.quote import AssetCurrentResponse, AssetHistoryResponse, QuoteBase
from src.services.fetcher import perform_sync

SAO_PAULO_TZ = pytz.timezone("America/Sao_Paulo")

router = APIRouter(prefix="/api", tags=["Quotes"])

@router.get("/quotes/current", response_model=List[AssetCurrentResponse])
async def get_current_quotes(session: AsyncSession = Depends(get_db)):
    stmt = select(Asset).order_by(Asset.symbol)
    result = await session.execute(stmt)
    assets = result.scalars().all()
    
    responses = []
    now = datetime.now(pytz.utc)
    
    for asset in assets:
        if not asset.current_price:
            continue
            
        current_price = float(asset.current_price)
        variation_absolute = 0.0
        variation_percent = 0.0
        market_status = "Aberto"
        
        # Determine market status
        now_sp = datetime.now(SAO_PAULO_TZ)
        if asset.type == "STOCK":
            is_weekday = now_sp.weekday() < 5
            is_open_hours = 10 <= now_sp.hour < 17
            market_status = "Mercado Aberto" if (is_weekday and is_open_hours) else "Mercado Fechado"
        elif asset.type == "CURRENCY":
            market_status = "Atualizado diariamente"
        else:
            market_status = "Mercado 24/7"
        
        # Determine the reference time/price based on asset type
        if asset.type == "CRYPTO":
            # 24h ago
            ref_time = now - timedelta(hours=24)
            # find the quote closest to 24h ago
            stmt_ref = select(Quote.price).where(
                Quote.asset_id == asset.asset_id,
                Quote.timestamp <= ref_time
            ).order_by(desc(Quote.timestamp)).limit(1)
            ref_price_scalar = (await session.execute(stmt_ref)).scalar_one_or_none()
            
        elif asset.type in ("CURRENCY", "STOCK"):
            # Use the explicitly saved previous close price
            ref_price_scalar = asset.previous_close_price if hasattr(asset, 'previous_close_price') else None
        else:
            ref_price_scalar = None
            
        if ref_price_scalar:
            ref_price = float(ref_price_scalar)
            variation_absolute = current_price - ref_price
            if ref_price > 0:
                variation_percent = (variation_absolute / ref_price) * 100
                
        responses.append(AssetCurrentResponse(
            symbol=asset.symbol,
            name=asset.name,
            type=asset.type,
            last_checked_at=asset.last_checked_at,
            current_price=current_price,
            variation_absolute=variation_absolute,
            variation_percent=variation_percent,
            market_status=market_status,
            source="API" # To satisfy schema if required
        ))
        
    return responses

@router.get("/quotes/history/{symbol}", response_model=AssetHistoryResponse)
async def get_history(symbol: str, period: str = "30d", session: AsyncSession = Depends(get_db)):
    stmt_asset = select(Asset).where(Asset.symbol == symbol)
    asset = (await session.execute(stmt_asset)).scalar_one_or_none()
    
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    days = 30
    if period == "7d":
        days = 7
    elif period == "90d":
        days = 90
    elif period == "1y":
        days = 365
        
    cutoff_date = datetime.now(pytz.utc) - timedelta(days=days)
    
    # If period > 7d, we aggregate by day to avoid sending thousands of points
    if days > 7:
        # PostgreSQL specific syntax for date_trunc with timezone
        # We take the closing price of each day (the last quote of the day)
        # We can use DISTINCT ON to get the last quote per day
        sql = """
            SELECT DISTINCT ON (date_sp)
                price,
                timestamp
            FROM (
                SELECT 
                    price,
                    timestamp,
                    date_trunc('day', timestamp AT TIME ZONE 'America/Sao_Paulo') as date_sp
                FROM quotes
                WHERE asset_id = :asset_id AND timestamp >= :cutoff
            ) as q
            ORDER BY date_sp ASC, timestamp DESC
        """
        result = await session.execute(text(sql), {"asset_id": asset.asset_id, "cutoff": cutoff_date})
        rows = result.fetchall()
        
        data = [
            QuoteBase(price=float(row.price), timestamp=row.timestamp)
            for row in rows
        ]
    else:
        # Raw data for 7 days
        stmt_quotes = select(Quote).where(
            Quote.asset_id == asset.asset_id,
            Quote.timestamp >= cutoff_date
        ).order_by(Quote.timestamp.asc())
        
        result = await session.execute(stmt_quotes)
        quotes = result.scalars().all()
        data = [
            QuoteBase(price=float(q.price), timestamp=q.timestamp)
            for q in quotes
        ]
        
    return AssetHistoryResponse(
        symbol=asset.symbol,
        period=period,
        data=data
    )

@router.post("/cron/fetch")
async def trigger_fetch(authorization: str = Header(None), session: AsyncSession = Depends(get_db)):
    if len(settings.CRON_SECRET) < 32 or settings.CRON_SECRET == "secret_token_for_cron_endpoint":
        raise HTTPException(status_code=503, detail="Administrative endpoint unavailable")
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    expected_token = f"Bearer {settings.CRON_SECRET}"
    if not secrets.compare_digest(authorization, expected_token):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    await perform_sync(session)
    
    return {"status": "success", "message": "Fetch triggered and synced successfully"}

@router.get("/quotes/stats")
async def get_stats(session: AsyncSession = Depends(get_db)):
    from src.schemas.stats import IngestionStats
    
    # Count assets
    total_assets = (await session.execute(select(func.count(Asset.asset_id)))).scalar()
    # Count quotes
    total_quotes = (await session.execute(select(func.count(Quote.quote_id)))).scalar()
    
    # Last sync time from assets
    stmt_last_sync = select(func.max(Asset.last_checked_at))
    last_sync = (await session.execute(stmt_last_sync)).scalar()
    if last_sync and last_sync.tzinfo is None:
        last_sync = pytz.utc.localize(last_sync)
    
    # DB size
    size_sql = text("SELECT pg_database_size(current_database()) / 1024.0 / 1024.0;")
    db_size = (await session.execute(size_sql)).scalar()
    
    return IngestionStats(
        total_assets=total_assets or 0,
        total_quotes=total_quotes or 0,
        last_sync_sp=last_sync or datetime.now(pytz.utc),
        database_size_mb=round(float(db_size), 2) if db_size else 0.0
    )


@router.get("/assets")
async def get_assets(session: AsyncSession = Depends(get_db)):
    stmt = select(Asset).order_by(Asset.symbol)
    result = await session.execute(stmt)
    assets = result.scalars().all()
    return [{"symbol": a.symbol, "name": a.name, "type": a.type} for a in assets]

@router.get("/health")
async def health_check(session: AsyncSession = Depends(get_db)):
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Service unavailable") from None
    return {"status": "ok", "timestamp": datetime.now(pytz.utc).isoformat()}
