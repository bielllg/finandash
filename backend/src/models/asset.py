from sqlalchemy import Column, String, BigInteger, DateTime, func
from .base import Base

class Asset(Base):
    __tablename__ = "assets"
    
    asset_id = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False) # 'CURRENCY', 'CRYPTO', 'STOCK'
    
    # Metadata for the "last updated" badge, regardless of price change
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    
    # Keeping the last variation metadata directly in asset to avoid computing on every fetch for current board
    current_price = Column(String, nullable=True) # or Numeric if we strictly parse, but String avoids decimal issues in metadata
    previous_close_price = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
