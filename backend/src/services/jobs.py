"""Durable report queue. A dedicated worker performs external side effects."""
from sqlalchemy import text
from src.core.database import AsyncSessionLocal, engine

async def enqueue_report(key: str) -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(text('INSERT INTO report_jobs (job_key) VALUES (:key) ON CONFLICT DO NOTHING'), {'key': key})
        await session.commit()

async def run_report_job() -> bool:
    from src.services.reports import generate_and_upload_reports
    async with engine.connect() as connection, AsyncSessionLocal() as session:
        # Session-level lock prevents multiple workers from sending at once.
        locked = (await connection.execute(text('SELECT pg_try_advisory_lock(842019)'))).scalar()
        if not locked:
            return False
        try:
            job = (await session.execute(text("SELECT job_key FROM report_jobs WHERE status='pending' ORDER BY created_at LIMIT 1"))).scalar()
            if not job:
                return False
            # Mark before side effects: ambiguous delivery must never be automatically replayed.
            await session.execute(text("UPDATE report_jobs SET status='processing', started_at=NOW() WHERE job_key=:key"), {'key': job})
            await session.commit()
            count = await generate_and_upload_reports()
            await session.execute(text("UPDATE report_jobs SET status=:status, finished_at=NOW() WHERE job_key=:key"), {'key': job, 'status': 'completed' if count else 'needs_review'})
            await session.commit()
            return True
        finally:
            await connection.execute(text('SELECT pg_advisory_unlock(842019)'))
