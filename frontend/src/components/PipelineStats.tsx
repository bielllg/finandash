import { useQuery } from '@tanstack/react-query'
import type { AxiosInstance } from 'axios'
import { Database, Activity, HardDrive } from 'lucide-react'

interface PipelineStatsProps {
  api: AxiosInstance
}

export default function PipelineStats({ api }: PipelineStatsProps) {
  const { data: stats } = useQuery({
    queryKey: ['quotes', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/quotes/stats')
      return data
    },
    refetchInterval: 60 * 1000,
  })

  if (!stats) return null

  const formatTime = (dateStr: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(new Date(dateStr))
  }

  return (
    <div className="bg-bg-secondary rounded-2xl p-6 shadow-2xl border border-border-subtle mt-8">
      <div className="flex items-center gap-2 mb-4">
        <Database size={20} className="text-accent" />
        <h2 className="text-xl font-bold text-text-primary">Pipeline de Dados (Ingestão)</h2>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-4 bg-bg-primary p-4 rounded-lg border border-border-subtle">
          <div className="p-3 bg-accent/10 rounded-full text-accent">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Registros Deduplicados</p>
            <p className="text-xl font-bold text-text-primary">
              {new Intl.NumberFormat('pt-BR').format(stats.total_quotes)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-bg-primary p-4 rounded-lg border border-border-subtle">
          <div className="p-3 bg-accent/10 rounded-full text-accent">
            <HardDrive size={24} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Tamanho do Banco</p>
            <p className="text-xl font-bold text-text-primary">
              {stats.database_size_mb} MB
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-bg-primary p-4 rounded-lg border border-border-subtle">
          <div className="p-3 bg-positive/10 rounded-full text-positive">
            <Database size={24} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">Última Sincronização</p>
            <p className="text-xl font-bold text-text-primary">
              {formatTime(stats.last_sync_sp)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
