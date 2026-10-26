import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from './lib/api'
import QuoteCard from './components/QuoteCard'
import QuoteChart from './components/QuoteChart'
import PipelineStats from './components/PipelineStats'
import CurrencyConverter from "./components/CurrencyConverter";
import Base100Comparator from './components/Base100Comparator'
import FeaturesSection from './components/FeaturesSection'
import { useWatchlist } from './hooks/useWatchlist'
import { Plus, X, BarChart2 } from 'lucide-react'

interface CurrentQuote {
  symbol: string
  name: string
  type: string
  last_checked_at: string | null
  current_price: number | null
  variation_absolute: number | null
  variation_percent: number | null
  market_status?: string
}

interface AssetDef { symbol: string; name: string; type: string; }

interface DashboardProps {
  keyboardTriggers?: {
    triggerCompare: number
    triggerAdd: number
  }
}

export default function Dashboard({ keyboardTriggers }: DashboardProps = {}) {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [activeTab, setActiveTab] = useState('market')
  const [assetSearch, setAssetSearch] = useState('')
  const [assetCategory, setAssetCategory] = useState('ALL')
  const [showComparator, setShowComparator] = useState(false)
  const { watchlist, addAsset, removeAsset } = useWatchlist()


  useEffect(() => {
    if (keyboardTriggers?.triggerCompare) {
      setShowComparator(true)
    }
  }, [keyboardTriggers?.triggerCompare])

  useEffect(() => {
    if (keyboardTriggers?.triggerAdd) {
      setIsAdding(true)
    }
  }, [keyboardTriggers?.triggerAdd])

  const { data: allAssets } = useQuery<AssetDef[]>({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data } = await api.get('/assets')
      return data
    },
    staleTime: 60 * 60 * 1000,
  })

  const { data: quotes, isLoading, isError } = useQuery<CurrentQuote[]>({
    queryKey: ['quotes', 'current'],
    queryFn: async () => {
      const { data } = await api.get('/quotes/current')
      return data
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    placeholderData: keepPreviousData,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full mb-4"></div>
        <p>Iniciando serviços... (pode demorar até 50s na primeira carga)</p>
      </div>
    )
  }

  if (isError || !quotes) {
    return (
      <div className="py-20 text-center text-negative">
        <p>Erro ao carregar dados. Tente novamente mais tarde.</p>
      </div>
    )
  }

  // Filter quotes by watchlist
  const displayQuotes = quotes.filter(q => watchlist.includes(q.symbol))
  const activeAsset = selectedAsset || (displayQuotes.length > 0 ? displayQuotes[0].symbol : null)
  
  const availableToAdd = allAssets?.filter(a => !watchlist.includes(a.symbol)) || []

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Resumo do mercado">
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5"><p className="text-sm text-text-secondary">Ativos acompanhados</p><p className="text-3xl font-bold mt-2">{displayQuotes.length}<span className="text-sm text-text-secondary font-normal ml-2">na sua seleção</span></p></div>
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5"><p className="text-sm text-text-secondary">Em alta na seleção</p><p className="text-3xl font-bold text-positive mt-2">{displayQuotes.filter(q => (q.variation_percent ?? 0) > 0).length}<span className="text-sm text-text-secondary font-normal ml-2">ativos</span></p></div>
        <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5"><p className="text-sm text-text-secondary">Última verificação</p><p className="text-2xl font-bold mt-2">{quotes.map(q => q.last_checked_at).filter(Boolean).sort().at(-1) ? new Date(quotes.map(q => q.last_checked_at).filter(Boolean).sort().at(-1)!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Indisponível'}</p></div>
      </section>
      <nav className="flex gap-2 border-b border-border-subtle pb-3" aria-label="Seções do painel">
        {[['market', 'Mercado'], ['tools', 'Simulador e relatórios']].map(([id, label]) => <button key={id} onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`px-5 py-3 rounded-xl font-semibold transition-colors ${activeTab === id ? 'bg-accent/15 text-accent' : 'text-text-secondary hover:bg-bg-secondary'}`}>{label}</button>)}
      </nav>
      {activeTab === 'market' && <>
      <div className="flex flex-wrap justify-between items-start sm:items-center mb-4 gap-4 [&:has(.asset-picker)]:pb-2">
        <h2 className="text-2xl font-bold text-text-primary">Sua Carteira</h2>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto contents">
          <button 
            onClick={() => setShowComparator(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-base font-medium bg-bg-secondary border border-border-subtle hover:bg-bg-primary px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <BarChart2 size={18} />
            Comparar
          </button>
          
          <div className="flex-1 sm:flex-none contents">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="w-full flex items-center justify-center gap-2 text-base font-medium bg-accent text-white hover:bg-accent/90 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              {isAdding ? <X size={18} /> : <Plus size={18} />}
              {isAdding ? 'Fechar' : 'Adicionar Ativo'}
            </button>
            
            {isAdding && (
              <div className="asset-picker basis-full bg-bg-secondary border border-accent/30 rounded-2xl p-5 md:p-6" onKeyDown={e => { if (e.key === 'Escape') setIsAdding(false) }}>
                <h3 className="text-xl font-bold">Explore os ativos</h3>
                <p className="text-sm text-text-secondary mt-1 mb-4">Adicione ações, criptomoedas e moedas à sua carteira.</p>
                <input autoFocus aria-label="Buscar ativo" placeholder="Buscar por símbolo ou nome..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-bg-primary px-4 py-3 mb-3 focus:outline-none focus:ring-2 focus:ring-accent" />
                <div className="flex flex-wrap gap-2 mb-4">
                  {[['ALL', 'Todos'], ['STOCK', 'Ações'], ['CRYPTO', 'Criptomoedas'], ['CURRENCY', 'Moedas']].map(([id, label]) => <button key={id} aria-pressed={assetCategory === id} onClick={() => setAssetCategory(id)} className={`rounded-lg px-3 py-2 text-sm font-medium ${assetCategory === id ? 'bg-accent text-white' : 'bg-bg-primary text-text-secondary'}`}>{label}</button>)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {availableToAdd.length === 0 ? (
                <p className="text-sm px-2 text-text-secondary">Nenhum ativo novo.</p>
              ) : (
                availableToAdd.filter(asset => (assetCategory === 'ALL' || asset.type === assetCategory) && `${asset.symbol} ${asset.name}`.toLowerCase().includes(assetSearch.toLowerCase())).map(asset => (
                  <button
                    key={asset.symbol}
                    onClick={() => {
                      addAsset(asset.symbol)
                    }}
                    className="w-full text-left p-4 border border-border-subtle hover:border-accent hover:bg-bg-primary focus-visible:ring-2 focus-visible:ring-accent rounded-xl flex justify-between items-center gap-3"
                  >
                    <span><span className="block font-bold text-base">{asset.symbol}</span><span className="block text-text-secondary text-sm mt-1">{asset.name}</span></span>
                    <Plus size={20} className="text-accent shrink-0" aria-hidden="true" />
                  </button>
                ))
              )}
                </div>
                <p className="text-xs text-text-secondary mt-4">{availableToAdd.length} ativos disponíveis · Clique em + para adicionar</p>
            </div>
          )}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayQuotes.map((quote, idx) => (
          <div key={quote.symbol} className="relative group h-full">
            <QuoteCard 
              quote={quote} 
              index={idx}
              isActive={activeAsset === quote.symbol}
              onClick={() => setSelectedAsset(quote.symbol)}
            />
            {watchlist.length > 1 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  removeAsset(quote.symbol)
                  if (selectedAsset === quote.symbol) setSelectedAsset(null)
                }}
                className="absolute top-2 right-2 p-1 bg-negative/20 text-negative rounded-full opacity-70 hover:opacity-100 focus:opacity-100 transition-opacity"
                title="Remover"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        
        {displayQuotes.length === 0 && (
          <div className="col-span-full py-10 text-center text-text-secondary border border-dashed border-border-subtle rounded-2xl">
            Nenhum ativo na sua carteira. Adicione um acima.
          </div>
        )}
      </div>

      {/* Main Chart Area */}
      {activeAsset && displayQuotes.find(q => q.symbol === activeAsset) && (
        <div>
          <QuoteChart symbol={activeAsset} api={api} />
        </div>
      )}


      <CurrencyConverter />
      </>}

      {/* Advanced Features (Simulator & Alerts) */}
      {activeTab === 'tools' && <FeaturesSection />}

      {/* Data Engineering Pipeline Stats */}
      <PipelineStats api={api} />

      {/* Base 100 Comparator Modal */}
      {showComparator && (
        <Base100Comparator 
          symbols={watchlist} 
          onClose={() => setShowComparator(false)} 
        />
      )}
    </div>
  )
}
