from sqlalchemy import Column, BigInteger, String, DateTime, func
from .base import Base

class Subscriber(Base):
    __tablename__ = "subscribers"
    
    subscriber_id = Column(BigInteger, primary_key=True, autoincrement=True)
    phone_number = Column(String(50), unique=True, nullable=False, index=True)
    chat_id = Column(String(50), nullable=True, index=True)
    consented_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
