import pytest
from src.schemas.quote import AssetCurrentResponse
from datetime import datetime

def test_asset_current_response_schema():
    data = {
        "symbol": "USD",
        "name": "USD/BRL",
        "type": "CURRENCY",
        "last_checked_at": datetime.now(),
        "current_price": 5.10,
        "variation_absolute": 0.05,
        "variation_percent": 1.0,
    }
    obj = AssetCurrentResponse(**data)
    assert obj.symbol == "USD"
    assert obj.current_price == 5.10
