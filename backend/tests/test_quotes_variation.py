import pytest
import pytz
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.asset import Asset
from src.models.quote import Quote
from src.routers.quotes import get_current_quotes

SAO_PAULO_TZ = pytz.timezone("America/Sao_Paulo")

@pytest.mark.asyncio
async def test_variation_zero_bug(db_session: AsyncSession):
    # This test proves that the old logic causes 0% variation on weekends/after hours
    # when the last quote is from the previous day.
    
    # 1. Create an asset
    asset = Asset(asset_id=1, symbol="TEST3", name="Test Stock", type="STOCK", current_price="15.00")
    db_session.add(asset)
    await db_session.flush()
    
    now_sp = datetime.now(SAO_PAULO_TZ)
    
    # Let's pretend today is Saturday
    # And the last quote was Friday 17:00
    # Wait, the current logic relies on `datetime.now(pytz.utc)` inside `get_current_quotes`.
    # We can't mock `datetime.now` easily without a monkeypatch.
    # Instead, let's insert a quote that is older than start_of_today_sp.
    
    start_of_today_sp = now_sp.replace(hour=0, minute=0, second=0, microsecond=0)
    friday_close = start_of_today_sp - timedelta(hours=7) # yesterday 17:00
    
    quote = Quote(quote_id=1, asset_id=asset.asset_id, price=15.0, timestamp=friday_close)
    db_session.add(quote)
    await db_session.commit()
    
    # Now get current quotes
    # The current price is 15.0 (from asset.current_price)
    # The ref_price will be found as the quote we just inserted (since it's < start_of_today_sp)
    # Variation should be calculated against the actual previous close (which was e.g. 10.0 on Thursday)
    # But because it picks Friday's close, it will yield 0.0%.
    
    # We expect variation to be correctly calculated against previous_close_price
    # Because we now save previous_close_price explicitly
    asset.previous_close_price = "10.00"
    db_session.add(asset)
    await db_session.commit()
    
    quotes_response = await get_current_quotes(db_session)
    
    test_response = next((q for q in quotes_response if q.symbol == "TEST3"), None)
    assert test_response is not None
    
    # Variation should be (15 - 10) / 10 = 50.0%
    assert test_response.variation_percent == 50.0
