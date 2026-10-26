import { X, TrendingUp, BellRing, Sparkles } from 'lucide-react'
import { useDialog } from '../hooks/useDialog'

interface IntroModalProps {
  onClose: () => void
}

export default function IntroModal({ onClose }: IntroModalProps) {
  const dialogRef = useDialog(onClose)
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-bg-secondary w-full max-w-lg rounded-2xl shadow-2xl border border-border-subtle overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300"
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-label="Conheça o FinanDash"
        aria-modal="true"
      >
        <div className="flex justify-between items-start p-6 border-b border-border-subtle bg-gradient-to-br from-bg-primary to-bg-secondary relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent/10 text-accent rounded-full text-[10px] font-bold mb-3 uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Bem-vindo</span>
            </div>
            <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
              Olá! Conheça o FinanDash.
            </h2>
          </div>
          <button 
            aria-label="Fechar apresentação"
            onClick={onClose} 
            className="p-2 hover:bg-bg-primary rounded-full text-text-secondary transition-colors relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-text-secondary leading-relaxed">
            Este é um painel financeiro de alta performance projetado para demonstrar arquitetura moderna (React + FastAPI) no meu portfólio.
          </p>
          
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 shrink-0">
                <TrendingUp size={20} />
              </div>
              <div>
            <h3 className="font-bold text-text-primary">Planilha na Nuvem</h3>
                <p className="text-sm text-text-secondary">A sincronização com planilhas depende de credenciais configuradas no backend; esta demonstração não publica uma planilha.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="p-2 bg-green-500/10 rounded-lg text-green-500 shrink-0">
                <BellRing size={20} />
              </div>
              <div>
                <h3 className="font-bold text-text-primary">Relatórios (Telegram)</h3>
                <p className="text-sm text-text-secondary">Com o worker ativo, o bot oferece relatórios semanais após o comando /assinar em conversa privada. Alertas por preço não estão disponíveis.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border-subtle bg-bg-primary/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-accent text-white font-bold rounded-lg hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20 w-full sm:w-auto"
          >
            Explorar o Painel
          </button>
        </div>
      </div>
    </div>
  )
}
