from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import secrets as _secrets

from src.core.config import settings

router = APIRouter(prefix="/api/features", tags=["features"])

class SimulateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    initial_amount: float = Field(ge=0, le=1_000_000_000)
    monthly_contribution: float = Field(ge=0, le=1_000_000_000)
    annual_rate: float = Field(ge=-99, le=1000)
    years: int = Field(ge=1, le=100)

class SimulateResponseItem(BaseModel):
    month: int
    total_amount: float
    total_invested: float

class SimulateResponse(BaseModel):
    data: List[SimulateResponseItem]

@router.post("/simulate", response_model=SimulateResponse)
async def simulate_investment(req: SimulateRequest):
    data = []
    current_amount = req.initial_amount
    total_invested = req.initial_amount
    monthly_rate = (1 + req.annual_rate / 100) ** (1/12) - 1
    
    data.append(SimulateResponseItem(month=0, total_amount=round(current_amount, 2), total_invested=round(total_invested, 2)))

    # For very long periods, we might want to return less data points to avoid crashing the browser,
    # but 1200 points (100 years * 12) is fine for Recharts if the width handles it.
    for m in range(1, req.years * 12 + 1):
        current_amount = current_amount * (1 + monthly_rate) + req.monthly_contribution
        total_invested += req.monthly_contribution
        
        # To optimize payload for very large years, we could skip months, but let's stick to monthly
        data.append(SimulateResponseItem(
            month=m,
            total_amount=round(current_amount, 2),
            total_invested=round(total_invested, 2)
        ))
        
    return SimulateResponse(data=data)

@router.post("/alerts/subscribe")
async def subscribe_alerts():
    raise HTTPException(status_code=410, detail="Inscrição removida. Use /assinar na conversa privada do bot Telegram.")

@router.post("/reports/trigger")
async def trigger_reports(authorization: str = Header(None)):
    """Endpoint protegido — requer Authorization: Bearer <CRON_SECRET>"""
    if len(settings.CRON_SECRET) < 32 or settings.CRON_SECRET == "secret_token_for_cron_endpoint":
        raise HTTPException(status_code=503, detail="Administrative endpoint unavailable")
    if not authorization or not _secrets.compare_digest(
        authorization, f"Bearer {settings.CRON_SECRET}"
    ):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    from src.services.jobs import enqueue_report
    from datetime import datetime, timezone
    await enqueue_report('manual_' + datetime.now(timezone.utc).strftime('%Y%m%d%H%M'))
    return {"message": "Relatório colocado na fila. Repetições no mesmo minuto são agrupadas."}
