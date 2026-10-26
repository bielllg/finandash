from sqlalchemy import Column, BigInteger, Numeric, DateTime, ForeignKey, UniqueConstraint, String
from .base import Base

class Quote(Base):
    __tablename__ = "quotes"
    
    quote_id = Column(BigInteger, primary_key=True, autoincrement=True)
    asset_id = Column(BigInteger, ForeignKey("assets.asset_id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Store price with high precision
    price = Column(Numeric(20, 8), nullable=False)
    
    # The timestamp of the quote
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    
    source = Column(String(50), nullable=True, server_default='legacy')
    
    # Unique constraint ensures idempotent backfills
    __table_args__ = (
        UniqueConstraint('asset_id', 'timestamp', name='uq_asset_timestamp'),
    )
