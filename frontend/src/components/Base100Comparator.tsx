import { useState, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { api } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { X } from 'lucide-react'
import { useDialog } from '../hooks/useDialog'

interface Base100ComparatorProps {
  symbols: string[]
  onClose: () => void
}

const COLORS = ['#00C2FF', '#00E676', '#FF3D00', '#FFC400', '#E040FB', '#1DE9B6']

const PERIODS = [
  { id: '7d', label: '7 Dias' },
  { id: '30d', label: '30 Dias' },
  { id: '90d', label: '90 Dias' },
  { id: '1y', label: '1 Ano' }
]

export default function Base100Comparator({ symbols, onClose }: Base100ComparatorProps) {
  const dialogRef = useDialog(onClose)
  const [period, setPeriod] = useState('30d')

  const queries = useQueries({
    queries: symbols.map(symbol => ({
      queryKey: ['quotes', 'history_v2', symbol, period],
      queryFn: async () => {
        const { data } = await api.get(`/quotes/history/${symbol}?period=${period}`)
        return data.data // Keep same signature as QuoteChart to share cache
      },
      staleTime: 60 * 1000,
    }))
  })

  const isLoading = queries.some(q => q.isLoading)

  const chartData = useMemo(() => {
    if (isLoading) return []
    
    // Group by timestamp
    const map = new Map<string, any>()
    
    queries.forEach((q, index) => {
      if (!q.data || !Array.isArray(q.data)) return
      
      const symbol = symbols[index]
      const data = q.data
      
      if (data.length === 0) return
      const basePrice = data[0].price
      
      data.forEach((d: any) => {
        const ts = new Date(d.timestamp).toISOString().split('T')[0] // normalize day
        if (!map.has(ts)) {
          map.set(ts, { date: ts })
        }
        
        // Base 100 calculation
        const val = (d.price / basePrice) * 100
        map.get(ts)[symbol] = val
      })
    })
    
    // Sort by date
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
  }, [queries, isLoading])

  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }).format(new Date(dateStr));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="bg-bg-secondary w-full max-w-4xl rounded-2xl shadow-2xl border border-border-subtle p-6 flex flex-col max-h-[90vh]"
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="comparator-title"
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 id="comparator-title" className="text-2xl font-bold text-text-primary">Comparador Base 100</h2>
            <p className="text-text-secondary">Compare o rendimento percentual dos ativos da sua carteira.</p>
          </div>
          <button aria-label="Fechar comparador" onClick={onClose} className="p-2 hover:bg-bg-primary rounded-full text-text-secondary transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6">
          {PERIODS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                period === p.id 
                  ? 'bg-accent text-white' 
                  : 'bg-bg-primary text-text-secondary hover:text-text-primary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="w-full h-[400px]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-text-secondary animate-pulse">
              Calculando Base 100...
            </div>
          ) : chartData.length === 0 ? (
             <div className="h-full flex items-center justify-center text-text-secondary">
              Sem dados suficientes para comparação.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--color-text-secondary)" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={['auto', 'auto']}
                  stroke="var(--color-text-secondary)"
                  tickFormatter={(val) => val !== undefined && val !== null ? Number(val).toFixed(0) : ''}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                  labelFormatter={formatDate}
                  formatter={(value: any, name: any) => [value !== undefined && value !== null ? Number(value).toFixed(2) : '-', name]}
                />
                <Legend />
                {symbols.map((sym, i) => (
                  <Line 
                    key={sym}
                    type="monotone" 
                    dataKey={sym} 
                    stroke={COLORS[i % COLORS.length]} 
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
