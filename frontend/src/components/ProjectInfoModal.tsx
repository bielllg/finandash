import { X, Briefcase, Code, ShieldCheck, LayoutDashboard } from 'lucide-react'
import { useDialog } from '../hooks/useDialog'

interface ProjectInfoModalProps {
  onClose: () => void
}

export default function ProjectInfoModal({ onClose }: ProjectInfoModalProps) {
  const ref = useDialog(onClose)
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-bg-secondary w-full max-w-3xl rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200"
        role="dialog"
        ref={ref} tabIndex={-1}
        aria-modal="true"
        aria-labelledby="info-title"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-border-subtle bg-bg-primary/50">
          <div>
            <h2 id="info-title" className="text-2xl font-extrabold text-text-primary flex items-center gap-2">
              <LayoutDashboard className="text-accent" />
              Sobre o Projeto
            </h2>
            <p className="text-sm text-text-secondary mt-1">Desenvolvido para Portfólio</p>
          </div>
          <button aria-label="Fechar informações do projeto" onClick={onClose} className="p-2 hover:bg-bg-primary rounded-full text-text-secondary transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          <section>
            <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <Briefcase size={20} className="text-accent" />
              O que é este Painel?
            </h3>
            <p className="text-text-secondary leading-relaxed">
              O <strong>FinanDash</strong> é um painel demonstrativo para acompanhar preços e históricos de ações da B3, criptomoedas e moedas globais, conforme os dados disponíveis nas fontes integradas.
            </p>
            <p className="text-text-secondary leading-relaxed mt-2">
              Seu diferencial é o <strong>Comparador Base 100</strong>, uma ferramenta técnica que ajusta o preço inicial de ativos totalmente distintos (como Bitcoin e Euro) para a "Base 100", revelando a rentabilidade percentual comparativa ao longo do tempo.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <Code size={20} className="text-accent" />
              Arquitetura e Tech Stack
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bg-primary p-4 rounded-xl border border-border-subtle">
                <h4 className="font-bold text-text-primary mb-2 border-b border-border-subtle pb-2">Frontend</h4>
                <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                  <li>React 18 + TypeScript</li>
                  <li>Tailwind CSS v4 (Design System)</li>
                  <li>Recharts (Gráficos interativos)</li>
                  <li>TanStack Query v5 (Cache/Sincronização)</li>
                  <li>Layout adaptável para celular e tablet</li>
                </ul>
              </div>
              <div className="bg-bg-primary p-4 rounded-xl border border-border-subtle">
                <h4 className="font-bold text-text-primary mb-2 border-b border-border-subtle pb-2">Backend & Dados</h4>
                <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
                  <li>FastAPI (Python Assíncrono)</li>
                  <li>PostgreSQL + SQLAlchemy + Asyncpg</li>
                  <li>Docker & Docker Compose</li>
                  <li>Worker opcional para ingestão em segundo plano</li>
                  <li>APIs: BCB, Brapi, Binance, CoinGecko</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-text-primary mb-3 flex items-center gap-2">
              <ShieldCheck size={20} className="text-accent" />
              Segurança e Confiabilidade
            </h3>
            <p className="text-text-secondary leading-relaxed text-sm">
              Controles de segurança implementados neste projeto:
            </p>
            <ul className="text-sm text-text-secondary space-y-2 mt-2 list-disc list-inside">
              <li><strong>Proteção de Credenciais:</strong> Tokens de API e senhas do banco residem exclusivamente no backend (via <code className="bg-bg-primary px-1 py-0.5 rounded border border-border-subtle">.env</code>), nunca expostos ao cliente.</li>
              <li><strong>Processamento:</strong> Relatórios são enfileirados e marcados para revisão quando a entrega é ambígua, evitando reenvio automático duplicado.</li>
              <li><strong>CORS Estrito:</strong> Políticas de Cross-Origin seguras via FastAPI para o domínio do frontend.</li>
              <li><strong>Privacidade:</strong> O cadastro do Telegram exige comando explícito em conversa privada e pode ser cancelado pelo próprio bot.</li>
            </ul>
          </section>


        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-bg-primary/30 flex justify-between items-center text-sm">
          <span className="text-text-secondary">Pronto para Portfólio</span>
          <span className="text-text-secondary">React · FastAPI</span>
        </div>
      </div>
    </div>
  )
}
