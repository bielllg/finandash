import asyncio
import csv
from src.core.database import AsyncSessionLocal
from src.models.subscriber import Subscriber
from sqlalchemy import select

async def export():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Subscriber))
        subscribers = result.scalars().all()
        
        with open('inscritos_telegram.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['ID', 'Usuario Telegram', 'Data de Inscricao'])
            for sub in subscribers:
                writer.writerow([sub.subscriber_id, sub.phone_number, sub.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        
        print(f"Sucesso! {len(subscribers)} inscritos exportados para inscritos_telegram.csv")

if __name__ == "__main__":
    asyncio.run(export())
