import asyncio
import datetime
from datetime import timedelta
import pytz
import httpx
from sqlalchemy import select, text

from src.core.config import settings
from src.core.database import AsyncSessionLocal
from src.models.subscriber import Subscriber
from src.services.reports import generate_and_upload_reports

SAO_PAULO_TZ = pytz.timezone("America/Sao_Paulo")

async def bot_polling_worker():
    """
    Escuta mensagens novas no Telegram.
    Só registra um chat após o comando explícito /assinar em conversa privada.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        print("⚠️ Bot polling desativado: TELEGRAM_BOT_TOKEN não configurado.")
        return

    print("🤖 Bot listener iniciado! Aguardando mensagens no Telegram...")
    offset = 0

    while True:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/getUpdates"
                params = {"offset": offset, "timeout": 10}
                resp = await client.get(url, params=params)
                data = resp.json()

                if data.get("ok"):
                    for update in data.get("result", []):
                        offset = max(offset, update.get("update_id", 0) + 1)
                        msg = update.get("message", {})
                        chat_id = str(msg.get("chat", {}).get("id", ""))
                        text_msg = msg.get("text", "").strip()

                        if msg.get("chat", {}).get("type") != "private" or not chat_id:
                            continue
                        command = text_msg.split()[0].lower() if text_msg else ""
                        async with AsyncSessionLocal() as session:
                            sub = (await session.execute(select(Subscriber).where(Subscriber.chat_id == chat_id))).scalar_one_or_none()
                            if command in ("/parar", "/excluir"):
                                if sub:
                                    await session.delete(sub)
                                    await session.commit()
                                reply_text = "Inscrição cancelada e cadastro removido."
                            elif command == "/assinar":
                                if sub is None:
                                    sub = Subscriber(phone_number=f"telegram:{chat_id}", chat_id=chat_id)
                                    session.add(sub)
                                sub.consented_at = datetime.datetime.now(datetime.timezone.utc)
                                await session.commit()
                                reply_text = "Inscrição confirmada. Relatórios às segundas, 20h. /parar cancela e exclui seu cadastro; /dados mostra os dados guardados."
                            elif command == "/dados":
                                reply_text = "Dados armazenados: identificador deste chat e data de inscrição. " + (str(sub.consented_at) if sub else "Nenhuma inscrição ativa.")
                            else:
                                reply_text = "FinanDash: relatórios de mercado semanais. Ao enviar /assinar, você autoriza guardar o identificador deste chat e a data de consentimento para receber os relatórios. /parar cancela e exclui o cadastro. /dados consulta seus dados. Não envie informações financeiras ou documentos."
                        reply_url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage"
                        await client.post(reply_url, json={"chat_id": chat_id, "text": reply_text})

        except asyncio.CancelledError:
            break
        except Exception as e:
            print("Telegram polling failed; retrying later.")

        await asyncio.sleep(5)


def get_current_week_key(now_sp: datetime.datetime) -> str:
    """
    Retorna a chave da semana baseada na segunda-feira 20h.
    O ciclo vai de Segunda-feira 20:00 até a próxima Segunda-feira 19:59.
    """
    # weekday(): Segunda = 0, Terça = 1, ..., Domingo = 6
    if now_sp.weekday() == 0 and now_sp.hour < 20:
        days_back = 7
    else:
        days_back = now_sp.weekday()
    cycle_date = (now_sp - timedelta(days=days_back)).date()
    return f"weekly_{cycle_date.strftime('%Y-%m-%d')}"


async def weekly_reports_worker():
    """
    Verifica a cada 30 segundos se é hora de disparar o relatório semanal.
    Regra: Toda segunda-feira às 20:00 (America/Sao_Paulo).
    Se o servidor estava desligado e ligou depois (ex: 21h ou terça), dispara na inicialização.
    """
    print("⏰ Agendador semanal ativado! Disparos programados para toda segunda-feira às 20:00 (SP).")

    while True:
        try:
            now_sp = datetime.datetime.now(SAO_PAULO_TZ)
            week_key = get_current_week_key(now_sp)

            if now_sp.weekday() > 0 or now_sp.hour >= 20:
                from src.services.jobs import enqueue_report
                await enqueue_report(week_key)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print("Weekly scheduling failed; retrying later.")

        # Checa a cada 30 segundos
        await asyncio.sleep(30)
