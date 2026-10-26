import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, BellRing, CheckCircle2, Send, FileText, Database } from 'lucide-react'
import { api } from '../lib/api'

export default function FeaturesSection() {
  const [initialAmount, setInitialAmount] = useState(1000)
  const [monthlyContribution, setMonthlyContribution] = useState(200)
  const [annualRate, setAnnualRate] = useState(10)
  const [years, setYears] = useState(5)
  const [simulationData, setSimulationData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSimulate = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const baseUrl = (api.defaults.baseURL || '/api').replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/features/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initial_amount: initialAmount,
          monthly_contribution: monthlyContribution,
          annual_rate: annualRate,
          years: years
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error('Simulation failed')
      if (result.data) {
        setSimulationData(result.data)
      }
    } catch (error) {
      setErrorMessage('Não foi possível simular. Confira os valores e tente novamente.')
      console.error('Failed to simulate:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="advanced-features" className="space-y-8 mt-8 border-t border-border-subtle pt-8 scroll-mt-6">
      {errorMessage && <p role="alert" className="text-negative">{errorMessage}</p>}
      {/* Investment Simulator */}
      <section className="bg-bg-primary rounded-xl border border-border-subtle p-6 shadow-sm">
        <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="text-accent" />
          Simulador de Investimentos
        </h3>
        <p className="text-text-secondary text-sm mb-6">
          Descubra o potencial do seu dinheiro a longo prazo. Faça uma simulação e veja o poder dos juros compostos.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4 lg:col-span-1">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Aporte Inicial (R$)</label>
              <input 
                aria-label="Aporte inicial em reais" type="number"
                min="0"
                max="1000000000"
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Aporte Mensal (R$)</label>
              <input 
                type="number"
                min="0"
                max="1000000000"
                value={monthlyContribution}
                aria-label="Aporte mensal em reais"
                onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Taxa Anual (%)</label>
              <input 
                type="number"
                min="-99"
                max="1000"
                value={annualRate}
                aria-label="Taxa anual em porcentagem"
                onChange={(e) => setAnnualRate(Number(e.target.value))}
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">Período (Anos)</label>
              <input 
                type="number"
                min="1"
                max="100"
                value={years}
                aria-label="Período em anos"
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full bg-bg-secondary border border-border-subtle rounded-lg px-3 py-2 text-text-primary outline-none focus:border-accent"
              />
            </div>
            <button 
              onClick={handleSimulate}
              disabled={loading || years < 1 || years > 100 || annualRate <= -100}
              className="w-full py-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Simulando...' : 'Simular Agora'}
            </button>
          </div>
          
          <div className="lg:col-span-2 h-[300px] bg-bg-secondary rounded-lg border border-border-subtle p-4 flex items-center justify-center">
            {simulationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                  <XAxis dataKey="month" stroke="#888" fontSize={12} tickFormatter={(val) => `Mês ${val}`} />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12} 
                    tickFormatter={(val) => `R$ ${new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(val)}`} 
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e1e2d', borderColor: '#2b2b40', color: '#fff' }}
                    formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                    labelFormatter={(label) => `Mês ${label}`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_amount" name="Patrimônio Total" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="total_invested" name="Total Investido" stroke="#10b981" strokeWidth={2} dot={false} opacity={0.7} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-text-secondary text-sm">
                Preencha os dados e clique em "Simular Agora" para ver a projeção.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Smart Alerts */}
      <section className="bg-gradient-to-br from-bg-primary to-bg-secondary rounded-xl border border-accent/20 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <BellRing size={120} />
        </div>
        <div className="relative z-10 max-w-xl">
          <h3 className="text-xl font-bold text-text-primary mb-3 flex items-center gap-2">
            <BellRing className="text-accent" />
            Relatórios do Telegram (worker opcional)
          </h3>
          <p className="text-text-secondary mb-6 text-sm">
            Quando o worker do projeto estiver ativo, abra uma conversa privada com o <a href="https://t.me/FinanGabriel_bot" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">@FinanGabriel_bot</a> e envie <code>/assinar</code> para cadastrar este chat. Use <code>/parar</code> para cancelar e excluir seu cadastro, ou <code>/dados</code> para consultar os dados salvos. Alertas por preço não estão disponíveis.
          </p>
        </div>
        
        {/* Relatórios e Exportação */}
        <div className="mt-8 bg-bg-secondary p-8 rounded-xl border border-border-subtle">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-3">
              Relatórios Executivos & Nuvem
            </h3>
            <p className="text-text-secondary text-sm max-w-2xl mx-auto">
              A coleta e os relatórios dependem da configuração do servidor e dos provedores externos.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Telegram PDF */}
            <div className="bg-[#1c2736] p-6 rounded-xl border border-blue-500/20 flex flex-col h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Send size={80} className="text-blue-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                  <FileText size={24} />
                </div>
                <h4 className="text-lg font-bold text-white">Dashboard em PDF</h4>
              </div>
              <p className="text-blue-100/70 text-sm mb-6 flex-1">
                Com o worker ativo, assinantes recebem relatórios semanais em PDF. A entrega depende das fontes de dados e do Telegram; o serviço não envia alertas instantâneos por preço.
              </p>
              <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={14} />
                Enviado via Bot do Telegram
              </div>
            </div>

            {/* Google Sheets */}
            <div className="bg-[#152e25] p-6 rounded-xl border border-green-500/20 flex flex-col h-full relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Database size={80} className="text-green-400" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-lg text-green-400">
                  <TrendingUp size={24} />
                </div>
                <h4 className="text-lg font-bold text-white">Google Sheets (opcional)</h4>
              </div>
              <p className="text-green-100/70 text-sm mb-6 flex-1">
                A sincronização só funciona quando as credenciais são configuradas no backend.
              </p>
              <p className="text-xs text-green-100/70">Esta demonstração não publica uma planilha.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
