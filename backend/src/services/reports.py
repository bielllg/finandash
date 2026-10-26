import os
import asyncio
from html import escape
import io
import datetime
import base64
from sqlalchemy import select
import gspread
from google.oauth2.service_account import Credentials
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import httpx

from src.core.config import settings
from src.core.database import AsyncSessionLocal
from src.models.asset import Asset
from src.models.quote import Quote
from src.models.subscriber import Subscriber

def embedded_only_fetcher(url, *args, **kwargs):
    from weasyprint import default_url_fetcher
    if not url.startswith('data:image/png;base64,'):
        raise ValueError('External PDF resources are blocked')
    return default_url_fetcher(url, *args, **kwargs)

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']


def fig_to_base64(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=200, facecolor='white')
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return b64


def make_line_chart(asset_history: dict) -> str:
    """Gráfico de linha limpo — evolução base 100."""
    fig, ax = plt.subplots(figsize=(7.5, 3.2))
    palette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
               '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']
    
    for i, (symbol, data) in enumerate(asset_history.items()):
        if not data["prices"]:
            continue
        base = data["prices"][0]
        norm = [(p / base) * 100 for p in data["prices"]]
        color = palette[i % len(palette)]
        ax.plot(data["dates"], norm, label=symbol, linewidth=2.2, color=color)

    ax.set_ylabel("Base 100", fontsize=9, color='#64748B')
    ax.legend(fontsize=8, frameon=False, ncol=min(len(asset_history), 5),
              loc='upper center', bbox_to_anchor=(0.5, 1.18))
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#E2E8F0')
    ax.spines['bottom'].set_color('#E2E8F0')
    ax.grid(axis='y', color='#F1F5F9', linewidth=0.8)
    ax.tick_params(labelsize=8, colors='#94A3B8')
    fig.autofmt_xdate()
    return fig_to_base64(fig)


def make_bar_chart(assets: list) -> str:
    """Gráfico de barras — preços atuais (só ações e moedas, não crypto)."""
    items = []
    for a in assets:
        try:
            p = float(a.current_price) if a.current_price else 0
            if p > 0 and a.type != 'CRYPTO':
                items.append((a.symbol, p))
        except Exception:
            pass
    
    if not items:
        for a in assets:
            try:
                p = float(a.current_price) if a.current_price else 0
                if p > 0:
                    items.append((a.symbol, p))
            except Exception:
                pass
    
    items.sort(key=lambda x: x[1], reverse=True)
    items = items[:8]
    
    names = [x[0] for x in items]
    values = [x[1] for x in items]
    
    fig, ax = plt.subplots(figsize=(7.5, 3.2))
    colors_bar = ['#3B82F6', '#60A5FA', '#93C5FD', '#3B82F6', '#60A5FA',
                  '#93C5FD', '#3B82F6', '#60A5FA']
    bars = ax.bar(names, values, color=colors_bar[:len(names)], width=0.55,
                  edgecolor='none', zorder=3)
    
    # Valores acima das barras
    for bar, val in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + max(values)*0.02,
                f'R$ {val:,.2f}', ha='center', va='bottom', fontsize=7,
                color='#334155', fontweight='bold')
    
    ax.set_ylabel("R$", fontsize=9, color='#64748B')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['left'].set_color('#E2E8F0')
    ax.spines['bottom'].set_color('#E2E8F0')
    ax.grid(axis='y', color='#F1F5F9', linewidth=0.8, zorder=0)
    ax.tick_params(labelsize=8, colors='#94A3B8')
    return fig_to_base64(fig)


def make_donut_chart(assets: list) -> str:
    """Gráfico donut — composição do portfólio por tipo."""
    type_totals: dict[str, float] = {}
    for a in assets:
        try:
            p = float(a.current_price) if a.current_price else 0
            if p > 0:
                label = {'CURRENCY': 'Moedas', 'CRYPTO': 'Cripto', 'STOCK': 'Ações'}.get(a.type, a.type)
                type_totals[label] = type_totals.get(label, 0) + p
        except Exception:
            pass

    labels = list(type_totals.keys())
    sizes = list(type_totals.values())
    colors_donut = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#64748B']

    fig, ax = plt.subplots(figsize=(4, 3.8))
    wedges, texts, autotexts = ax.pie(
        sizes, labels=None, autopct='%1.0f%%', startangle=90,
        colors=colors_donut[:len(sizes)],
        wedgeprops=dict(width=0.45, edgecolor='white', linewidth=3),
        pctdistance=0.75
    )
    for t in autotexts:
        t.set_fontsize(10)
        t.set_fontweight('bold')
        t.set_color('white')

    # Legenda lateral
    ax.legend(wedges, [f'{l}  ({s/sum(sizes)*100:.0f}%)' for l, s in zip(labels, sizes)],
              loc='center left', bbox_to_anchor=(1, 0.5), fontsize=9,
              frameon=False, labelcolor='#334155')
    
    # Texto central
    total = sum(sizes)
    ax.text(0, 0, f'R$ {total:,.0f}', ha='center', va='center',
            fontsize=13, fontweight='bold', color='#0F172A')
    ax.text(0, -0.12, 'Total cotações', ha='center', va='center',
            fontsize=8, color='#94A3B8')

    return fig_to_base64(fig)


def build_html(assets, asset_history, img_bar, img_donut, img_line):
    """Monta o HTML do relatório no estilo dashboard premium."""
    now = datetime.datetime.now()
    
    # Calcular métricas para os cards
    total_assets = len(assets)
    
    # Melhor performance 7d
    best_name, best_pct = "—", 0
    worst_name, worst_pct = "—", 0
    for sym, data in asset_history.items():
        if data["prices"] and len(data["prices"]) >= 2:
            pct = (data["prices"][-1] / data["prices"][0] - 1) * 100
            if pct > best_pct:
                best_pct = pct
                best_name = sym
            if pct < worst_pct:
                worst_pct = pct
                worst_name = sym
    
    # Tabela de ativos
    rows_html = ""
    type_colors = {
        'CURRENCY': ('#DBEAFE', '#2563EB'),
        'CRYPTO': ('#D1FAE5', '#059669'),
        'STOCK': ('#FEF3C7', '#D97706'),
    }
    for a in assets:
        tc = type_colors.get(a.type, ('#F1F5F9', '#64748B'))
        price_str = f"R$ {float(a.current_price):,.2f}" if a.current_price else "—"
        rows_html += f"""
        <tr>
            <td style="font-weight:600;">{escape(a.symbol)}</td>
            <td>{escape(a.name)}</td>
            <td><span style="background:{tc[0]};color:{tc[1]};padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;">{a.type}</span></td>
            <td style="text-align:right;font-weight:600;">{price_str}</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
@page {{ size: A4 landscape; margin: 12mm; }}
* {{ margin:0; padding:0; box-sizing:border-box; }}
body {{ font-family: Helvetica, Arial, sans-serif; background:#F1F5F9; color:#0F172A; font-size:12px; }}
.page {{ background:white; border-radius:16px; padding:28px 32px; }}

/* ── HEADER ── */
.hdr {{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:22px; border-bottom:2px solid #E2E8F0; padding-bottom:18px; }}
.hdr-left h1 {{ font-size:22px; color:#1E3A5F; margin-bottom:2px; }}
.hdr-left p {{ font-size:12px; color:#64748B; }}
.hdr-right {{ text-align:right; font-size:11px; color:#64748B; line-height:1.6; }}
.hdr-right span {{ display:inline-block; background:#EFF6FF; color:#2563EB; padding:2px 10px; border-radius:6px; font-weight:600; font-size:11px; }}

/* ── CARDS ── */
.cards {{ display:flex; gap:16px; margin-bottom:22px; }}
.card {{ flex:1; border:1px solid #E2E8F0; border-radius:12px; padding:16px 18px; display:flex; align-items:center; gap:14px; }}
.card .dot {{ width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:20px; font-weight:700; flex-shrink:0; }}
.dot-blue {{ background:#DBEAFE; color:#2563EB; }}
.dot-green {{ background:#D1FAE5; color:#059669; }}
.dot-red {{ background:#FEE2E2; color:#DC2626; }}
.dot-purple {{ background:#EDE9FE; color:#7C3AED; }}
.card .info p {{ font-size:11px; color:#64748B; margin-bottom:2px; }}
.card .info h3 {{ font-size:18px; color:#0F172A; margin-bottom:1px; }}
.card .info .tag {{ font-size:11px; font-weight:600; }}
.tag-green {{ color:#059669; }}
.tag-red {{ color:#DC2626; }}
.tag-gray {{ color:#64748B; }}

/* ── GRID ── */
.row {{ display:flex; gap:16px; margin-bottom:16px; }}
.col {{ border:1px solid #E2E8F0; border-radius:12px; padding:16px 18px; background:white; }}
.col h4 {{ font-size:14px; color:#0F172A; margin-bottom:12px; font-weight:700; }}
.col img {{ width:100%; height:auto; }}

/* ── TABLE ── */
table {{ width:100%; border-collapse:collapse; font-size:11px; }}
th {{ text-align:left; padding:8px 6px; color:#64748B; font-weight:600; border-bottom:2px solid #E2E8F0; font-size:10px; text-transform:uppercase; letter-spacing:0.5px; }}
td {{ padding:9px 6px; border-bottom:1px solid #F1F5F9; color:#334155; }}

/* ── FOOTER ── */
.footer {{ text-align:center; margin-top:12px; font-size:10px; color:#94A3B8; padding-top:10px; border-top:1px solid #E2E8F0; }}
</style></head>
<body>
<div class="page">
    <!-- HEADER -->
    <div class="hdr">
        <div class="hdr-left">
            <h1>📊 Relatório de Mercado</h1>
            <p>Resumo analítico semanal dos ativos monitorados</p>
        </div>
        <div class="hdr-right">
            <span>📅 {now.strftime('%d/%m/%Y')}</span><br>
            <span style="margin-top:4px">Período: Últimos 7 dias</span>
        </div>
    </div>

    <!-- CARDS -->
    <div class="cards">
        <div class="card">
            <div class="dot dot-blue">$</div>
            <div class="info">
                <p>Ativos Monitorados</p>
                <h3>{total_assets}</h3>
                <span class="tag tag-green">✓ Sincronizados</span>
            </div>
        </div>
        <div class="card">
            <div class="dot dot-green">↑</div>
            <div class="info">
                <p>Maior Alta (7 dias)</p>
                <h3>{best_name}</h3>
                <span class="tag tag-green">↑ {best_pct:+.2f}%</span>
            </div>
        </div>
        <div class="card">
            <div class="dot dot-red">↓</div>
            <div class="info">
                <p>Maior Queda (7 dias)</p>
                <h3>{worst_name}</h3>
                <span class="tag tag-red">↓ {worst_pct:.2f}%</span>
            </div>
        </div>
        <div class="card">
            <div class="dot dot-purple">⚡</div>
            <div class="info">
                <p>Sinal de Mercado</p>
                <h3>{'Estável' if abs(best_pct) < 10 else 'Volátil'}</h3>
                <span class="tag tag-gray">Atualizado às {now.strftime('%H:%M')}</span>
            </div>
        </div>
    </div>

    <!-- ROW 1: Bar + Donut -->
    <div class="row">
        <div class="col" style="flex:1.4;">
            <h4>Cotações Atuais (R$)</h4>
            <img src="data:image/png;base64,{img_bar}">
        </div>
        <div class="col" style="flex:1;">
            <h4>Composição por Categoria</h4>
            <img src="data:image/png;base64,{img_donut}">
        </div>
    </div>

    <!-- ROW 2: Table + Line -->
    <div class="row">
        <div class="col" style="flex:1;">
            <h4>Últimas Cotações</h4>
            <table>
                <tr><th>Ativo</th><th>Nome</th><th>Tipo</th><th style="text-align:right">Preço</th></tr>
                {rows_html}
            </table>
        </div>
        <div class="col" style="flex:1.4;">
            <h4>Evolução do Mercado (Base 100)</h4>
            <img src="data:image/png;base64,{img_line}">
        </div>
    </div>

    <div class="footer">
        FinanDash &bull; Gerado automaticamente em {now.strftime('%d/%m/%Y às %H:%M')} &bull; Dados via brapi.dev &bull; Página 1 de 1
    </div>
</div>
</body></html>"""


async def generate_and_upload_reports(target_user: str = None):
    if not os.path.exists(settings.GOOGLE_CREDENTIALS_FILE):
        print("⚠️ Credenciais do Google não encontradas. Pulando Sheets.")

    # --- 1. Fetch Data ---
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Asset))
        assets = result.scalars().all()

        sub_result = await session.execute(select(Subscriber).where(Subscriber.consented_at.is_not(None)))
        subscribers = sub_result.scalars().all()
        
        # Se recebemos um alvo específico, filtramos a lista de inscritos
        if target_user:
            subscribers = [s for s in subscribers if s.phone_number.lower() == target_user.lower()]

        sheet_data = [["Símbolo", "Nome", "Tipo", "Preço Atual", "Fech. Anterior", "Última Atualização"]]
        asset_history: dict = {}

        for asset in assets:
            price = asset.current_price or "0"
            prev = asset.previous_close_price or "—"
            sheet_data.append([
                asset.symbol, asset.name, asset.type,
                price, prev, str(asset.last_checked_at)
            ])

            seven_days_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
            q_result = await session.execute(
                select(Quote)
                .where(Quote.asset_id == asset.asset_id, Quote.timestamp >= seven_days_ago)
                .order_by(Quote.timestamp)
            )
            quotes = q_result.scalars().all()
            if not quotes:
                # Fallback robusto caso o servidor tenha ficado desligado por dias
                fallback_result = await session.execute(
                    select(Quote)
                    .where(Quote.asset_id == asset.asset_id)
                    .order_by(Quote.timestamp.desc())
                    .limit(20)
                )
                quotes = list(reversed(fallback_result.scalars().all()))

            if quotes:
                asset_history[asset.symbol] = {
                    "dates": [q.timestamp for q in quotes],
                    "prices": [float(q.price) for q in quotes]
                }

    # --- 2. Update Google Sheet ---
    if os.path.exists(settings.GOOGLE_CREDENTIALS_FILE) and settings.GOOGLE_SHEET_ID:
        try:
            def update_sheet():
                creds = Credentials.from_service_account_file(settings.GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
                gc = gspread.authorize(creds)
                sh = gc.open_by_key(settings.GOOGLE_SHEET_ID)
                worksheet = sh.sheet1
                worksheet.update(values=sheet_data, range_name="A1")
            await asyncio.to_thread(update_sheet)
            print("✅ Google Sheet atualizado com sucesso!")
        except Exception as e:
            print("Sheet update failed.")

    # --- 3. Generate PDF & Send via Telegram ---
    if not asset_history or not settings.TELEGRAM_BOT_TOKEN:
        print("⚠️ Sem dados de histórico ou token do Telegram não configurado.")
        return

    try:
        from weasyprint import HTML

        def render_pdf():
            # Gerar os 3 gráficos
            img_bar = make_bar_chart(assets)
            img_donut = make_donut_chart(assets)
            img_line = make_line_chart(asset_history)
    
            # Montar HTML e converter para PDF
            html_str = build_html(assets, asset_history, img_bar, img_donut, img_line)
            pdf_bytes = HTML(string=html_str, url_fetcher=embedded_only_fetcher).write_pdf()
            return pdf_bytes
        pdf_bytes = await asyncio.to_thread(render_pdf)
        filename = f"Relatorio_FinanDash_{datetime.datetime.now().strftime('%Y-%m-%d')}.pdf"

        print(f"✅ PDF gerado com sucesso ({len(pdf_bytes) / 1024:.0f} KB)")

        # Enviar para os inscritos (filtrados)
        sent_count = 0
        async with httpx.AsyncClient(timeout=30.0) as client:
            for sub in subscribers:
                chat_id = sub.chat_id

                if chat_id:
                    url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendDocument"
                    files = {"document": (filename, pdf_bytes, "application/pdf")}
                    data = {
                        "chat_id": chat_id,
                        "caption": "📊 *Relatório Semanal FinanDash*\n\nSeu dashboard com cotações, gráficos e análise de performance dos últimos 7 dias.",
                        "parse_mode": "Markdown"
                    }
                    resp = await client.post(url, data=data, files=files)
                    if resp.status_code == 200:
                        sent_count += 1
                        print("Report delivered successfully.")
                    else:
                        print("Report delivery rejected by provider.")
                else:
                    print("Recipient has no verified private chat.")

        return sent_count

    except Exception as e:
        print("Report generation or delivery failed; manual review required.")
        return 0


if __name__ == "__main__":
    import asyncio
    asyncio.run(generate_and_upload_reports())
