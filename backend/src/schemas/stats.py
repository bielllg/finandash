from pydantic import BaseModel
from datetime import datetime

class IngestionStats(BaseModel):
    total_assets: int
    total_quotes: int
    last_sync_sp: datetime
    database_size_mb: float
