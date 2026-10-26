from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from collections import defaultdict
import time

from src.core.config import settings
from src.routers import quotes, features
import asyncio
from src.core.database import engine, AsyncSessionLocal
from src.services.fetcher import perform_sync
from src.services.scheduler import bot_polling_worker, weekly_reports_worker

# ── Simple in-memory rate limiter ─────────────────────────────────────────────
# { ip: [timestamp, timestamp, ...] }
_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20       # max requests
RATE_WINDOW = 60      # per 60 seconds

def is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    for key in list(_rate_store):
        if not _rate_store[key] or now - _rate_store[key][-1] >= RATE_WINDOW:
            del _rate_store[key]
    if ip not in _rate_store and len(_rate_store) >= 10000:
        return True
    timestamps = _rate_store[ip]
    # keep only timestamps within the window
    _rate_store[ip] = [t for t in timestamps if now - t < RATE_WINDOW]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        return True
    _rate_store[ip].append(now)
    return False

async def fetch_data_task():
    await asyncio.sleep(5)
    while True:
        try:
            async with AsyncSessionLocal() as session:
                await perform_sync(session)
        except Exception:
            print("Background market data sync failed.")
        await asyncio.sleep(300)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicializa workers em background:
    # 1. Coleta periódica de dados de cotação (a cada 5 min)
    # 2. Listener do Telegram (captura mensagens e salva chat_id)
    # 3. Agendador semanal de relatórios (toda segunda às 20:00)
    tasks = []
    if settings.BACKGROUND_WORKERS_ENABLED:
        tasks = [asyncio.create_task(worker()) for worker in
                 (fetch_data_task, bot_polling_worker, weekly_reports_worker)]

    yield

    for task in tasks:
        task.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    # Disable interactive docs in production (set DOCS_ENABLED=false in .env)
    docs_url="/api/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/api/redoc" if settings.DOCS_ENABLED else None,
    openapi_url="/openapi.json" if settings.DOCS_ENABLED else None,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],   # restrict to only needed methods
    allow_headers=["Content-Type", "Authorization"],
)

# ── Security Headers + Rate Limiting Middleware ───────────────────────────────
@app.middleware("http")
async def security_middleware(request: Request, call_next):
    def secure(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        if "server" in response.headers:
            del response.headers["server"]
        return response

    if request.method == "POST":
        origin = request.headers.get("origin")
        allowed = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
        if origin and origin not in allowed:
            return secure(JSONResponse(status_code=403, content={"detail": "Origin not allowed"}))
        has_body = request.headers.get("content-length", "0") not in ("", "0") or "transfer-encoding" in request.headers
        if has_body:
            if request.headers.get("content-type", "").split(";")[0] != "application/json":
                return secure(JSONResponse(status_code=415, content={"detail": "JSON required"}))
            body = bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 16384:
                    return secure(JSONResponse(status_code=413, content={"detail": "Request too large"}))
            request._body = bytes(body)
    # Rate limiting (by IP)
    client_ip = request.client.host if request.client else "unknown"
    if is_rate_limited(client_ip):
        return secure(JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Try again in a moment."},
            headers={"Retry-After": "60"}
        ))

    response = await call_next(request)

    return secure(response)

app.include_router(quotes.router)
app.include_router(features.router)
