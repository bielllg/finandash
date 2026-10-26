import { Download } from "lucide-react";
import { useState, useMemo } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import type { AxiosInstance } from 'axios'
import { 
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import clsx from 'clsx'

interface QuoteChartProps {
  symbol: string
  api: AxiosInstance
}

interface HistoryPoint {
  timestamp: string
  price: number
  sma_7?: number
  sma_30?: number
}

const PERIODS = [
  { id: '7d', label: '7 Dias' },
  { id: '30d', label: '30 Dias' },
  { id: '90d', label: '90 Dias' },
  { id: '1y', label: '1 Ano' }
]

export default function QuoteChart({ symbol, api }: QuoteChartProps) {
  const [period, setPeriod] = useState('30d')
  const [showSMA7, setShowSMA7] = useState(false)
  const [showSMA30, setShowSMA30] = useState(false)

  const { data, isLoading } = useQuery<HistoryPoint[]>({
    queryKey: ['quotes', 'history_v2', symbol, period],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/history/${symbol}?period=${period}`)
      return data.data
    },
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  })

  // Export CSV
  const handleExportCSV = () => {
    if (!data || data.length === 0) return
    const csvHeader = 'Data;Preço;SMA_7;SMA_30\n'
    const csvContent = data.map(d => 
      `${d.timestamp};${d.price.toString().replace('.', ',')};${d.sma_7 ? d.sma_7.toString().replace('.', ',') : ''};${d.sma_30 ? d.sma_30.toString().replace('.', ',') : ''}`
    ).join('\n')
    
    const blob = new Blob([csvHeader + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${symbol}_history_${period}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const { max, min, avg, periodReturn } = useMemo(() => {
    if (!data || data.length === 0) return { max: 0, min: 0, avg: 0, periodReturn: 0 }
    
    const prices = data.map(d => d.price)
    const max = Math.max(...prices)
    const min = Math.min(...prices)
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    
    const first = prices[0]
    const last = prices[prices.length - 1]
    const periodReturn = first > 0 ? ((last - first) / first) * 100 : 0
    
    return { max, min, avg, periodReturn }
  }, [data])

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatPercent = (val: number) => {
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`
  }
  
  const formatDate = (dateStr: any) => {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('pt-BR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    }).format(new Date(dateStr));
  }

  return (
    <div className="bg-bg-secondary p-4 md:p-6 rounded-2xl shadow-xl border border-border-subtle h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-text-primary">Histórico ({symbol})</h2>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-primary hover:bg-accent text-text-secondary hover:text-white rounded-lg transition-all border border-border-subtle hover:border-accent text-sm font-medium shadow-sm animate-soft-pulse hover:animate-none"
            title="Baixar Histórico em CSV"
            aria-label="Exportar para CSV"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
          <div className="flex flex-wrap bg-bg-primary rounded-lg p-1 border border-border-subtle">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={clsx(
                  "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                  period === p.id
                    ? "bg-accent text-white shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-secondary mb-1">Máxima ({period})</p>
            <p className="text-lg font-semibold text-text-primary">
              {formatPrice(max)}
            </p>
          </div>
          <div className="bg-bg-primary p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-secondary mb-1">Mínima ({period})</p>
            <p className="text-lg font-semibold text-text-primary">
              {formatPrice(min)}
            </p>
          </div>
          <div className="bg-bg-primary p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-secondary mb-1">Média ({period})</p>
            <p className="text-lg font-semibold text-text-primary">
              {formatPrice(avg)}
            </p>
          </div>
          <div className="bg-bg-primary p-4 rounded-lg border border-border-subtle">
            <p className="text-xs text-text-secondary mb-1">Retorno Acumulado</p>
            <p className={clsx("text-lg font-semibold", periodReturn >= 0 ? "text-positive" : "text-negative")}>
              {formatPercent(periodReturn)}
            </p>
          </div>
        </div>
      )}

      {/* Toggles SMA */}
      <div className="flex gap-4 mb-4 items-center">
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={showSMA7} onChange={(e) => setShowSMA7(e.target.checked)} className="accent-accent" />
          SMA 7 Dias
        </label>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={showSMA30} onChange={(e) => setShowSMA30(e.target.checked)} className="accent-accent" />
          SMA 30 Dias
        </label>
      </div>

      <div className="h-[400px] w-full">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />
              <XAxis 
                dataKey="timestamp" 
                stroke="var(--color-text-secondary)" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis 
                domain={['auto', 'auto']} 
                stroke="var(--color-text-secondary)"
                tickFormatter={(val) => `R$ ${val}`}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-subtle)', borderRadius: '8px' }}
                itemStyle={{ color: 'var(--color-text-primary)' }}
                labelFormatter={formatDate}
                formatter={(value: any, name: any) => [formatPrice(value), name === 'price' ? 'Preço' : name]}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="price" 
                name="Preço"
                stroke="var(--color-accent)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
              />
              {showSMA7 && (
                <Line type="monotone" dataKey="sma_7" name="SMA 7" stroke="var(--color-positive)" strokeWidth={2} dot={false} />
              )}
              {showSMA30 && (
                <Line type="monotone" dataKey="sma_30" name="SMA 30" stroke="var(--color-negative)" strokeWidth={2} dot={false} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
