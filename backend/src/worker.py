"""Run with python -m src.worker after migrations; never with ASGI workers."""
import asyncio
from sqlalchemy import text
from src.core.database import engine
from src.main import fetch_data_task
from src.services.scheduler import bot_polling_worker, weekly_reports_worker
from src.services.jobs import run_report_job

async def queue_worker():
    while True:
        try:
            await run_report_job()
        except Exception:
            print('Report job failed; check job status before retrying.')
        await asyncio.sleep(10)

async def main():
    async with engine.connect() as connection:
        if not (await connection.execute(text('SELECT pg_try_advisory_lock(842018)'))).scalar():
            raise RuntimeError('Another background worker is active')
        try:
            await asyncio.gather(fetch_data_task(), bot_polling_worker(), weekly_reports_worker(), queue_worker())
        finally:
            await connection.execute(text('SELECT pg_advisory_unlock(842018)'))
    await engine.dispose()

if __name__ == '__main__':
    asyncio.run(main())
