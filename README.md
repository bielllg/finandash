# 📊 FinanDash - Ecossistema Financeiro Avançado

![Status](https://img.shields.io/badge/Status-Demonstração-informational)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791)

Painel demonstrativo de mercado com React, FastAPI e PostgreSQL. Cotações e histórico dependem de provedores externos e podem atrasar ou ficar indisponíveis.

O design foi inspirado na linguagem visual de produtos premium (como Apple, Porsche e Tesla), utilizando um "Dark Mode" sofisticado com toques de azul néon e tipografia limpa.

## ✨ Funcionalidades Principais

* **📈 Cotações e histórico:** Acompanhe ações da B3, criptomoedas e câmbio conforme a disponibilidade das fontes.
* **⚖️ Comparador Base 100:** Modal interativo que nivela todos os ativos a uma "Base 100", permitindo comparar a rentabilidade percentual pura entre ativos diferentes.
* **💰 Simulador:** Projeta juros compostos; é uma estimativa, não recomendação ou backtest de carteira.
* **🤖 Relatórios Telegram:** Assinatura opcional por `/assinar` em conversa privada; `/parar` remove o cadastro. Alertas por preço não estão disponíveis.
* **☁️ Google Sheets:** A sincronização só funciona com credenciais configuradas.
* **⚙️ Worker separado:** A coleta e os relatórios são desligados por padrão e exigem configuração explícita.

## 🛡️ Segurança & Auditoria Implementadas

Controles locais implementados incluem validação de entrada, limite do corpo JSON, CORS configurável, limitação básica de requisições, cabeçalhos e regras para ignorar arquivos de segredo. Isso não equivale a certificação nem substitui configuração segura de produção. Credenciais que já foram compartilhadas devem ser revogadas nos provedores.

## 🛠️ Tecnologias Utilizadas

**Frontend:**
* [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
* [Tailwind CSS v4](https://tailwindcss.com/) + [GSAP](https://gsap.com/)
* [Recharts](https://recharts.org/) (Visualização e Simulações)
* [TanStack Query v5](https://tanstack.com/query)

**Backend:**
* [FastAPI](https://fastapi.tiangolo.com/) (Async) + [SQLAlchemy](https://www.sqlalchemy.org/) + `asyncpg`
* [PostgreSQL](https://www.postgresql.org/)
* **Geração de PDF:** `WeasyPrint` + `Jinja2` + `Matplotlib`
* **Integrações:** API Telegram Bot + Google Sheets API (`gspread`)

**APIs Integradas:**
* **BCB:** Câmbio oficial (Ptax).
* **Brapi:** Cotações B3.
* **Binance & CoinGecko:** Criptomoedas 24/7.

## 🚀 Como Executar o Projeto

Certifique-se de ter o [Node.js](https://nodejs.org/), [Python 3.10+](https://www.python.org/) e o [Docker](https://www.docker.com/) instalados.

### 1. Subindo o Banco de Dados
Na pasta `backend`, inicie o PostgreSQL. A porta fica acessível somente no próprio computador:
```bash
cd backend
docker-compose up -d
```

### 2. Configurando o Backend
Abra um terminal e acesse a pasta `backend`:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```
Copie `.env.example` para `.env`, configure as origens do frontend e substitua o `CRON_SECRET` por um valor aleatório (por exemplo, gerado com `python -c "import secrets; print(secrets.token_urlsafe(48))"`). Não use valores de exemplo em produção. Guarde as credenciais do Google fora da pasta publicada.
```bash
alembic upgrade head
uvicorn src.main:app --reload
```
*O backend estará rodando em: http://localhost:8000. `/api/health` também verifica a conexão ao banco.*

Para coleta de cotações e bot, habilite `BACKGROUND_WORKERS_ENABLED=true` e execute um único processo `python -m src.worker`; confira as credenciais antes de habilitar, pois isso consulta provedores e pode enviar relatórios.

### 3. Configurando o Frontend
Abra um novo terminal e acesse a pasta `frontend`:
```bash
cd frontend
npm ci
npm run dev
```
*O frontend estará rodando em: http://localhost:5173*

---

**⌨️ Atalhos de Teclado no Frontend:**
* `C` - Abre o Comparador Base 100
* `A` - Adicionar novo Ativo
* `?` - Mostra a lista de atalhos
