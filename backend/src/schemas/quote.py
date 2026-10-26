from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional

class QuoteBase(BaseModel):
    price: float
    timestamp: datetime
    
class QuoteResponse(QuoteBase):
    quote_id: int
    asset_id: int
    model_config = ConfigDict(from_attributes=True)

class AssetCurrentResponse(BaseModel):
    symbol: str
    name: str
    type: str
    last_checked_at: Optional[datetime] = None
    current_price: Optional[float] = None
    variation_absolute: Optional[float] = None
    variation_percent: Optional[float] = None
    market_status: Optional[str] = None
    source: Optional[str] = None   
    model_config = ConfigDict(from_attributes=True)

class AssetHistoryResponse(BaseModel):
    symbol: str
    period: str
    data: list[QuoteBase]
