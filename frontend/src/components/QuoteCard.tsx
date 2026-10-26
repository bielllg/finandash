import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import clsx from 'clsx'
import Sparkline from './Sparkline'

gsap.registerPlugin(useGSAP)

interface QuoteCardProps {
  quote: any
  index: number
  isActive: boolean
  onClick: () => void
}

export default function QuoteCard({ quote, index, isActive, onClick }: QuoteCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Only animate on initial mount using opacity and transform
    gsap.fromTo(cardRef.current, 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, delay: index * 0.1, ease: 'power2.out' }
    )
  }, { scope: cardRef }) // scope bounds selector text to this component

  const isPositive = quote.variation_percent > 0
  const isNegative = quote.variation_percent < 0

  const formatPrice = (val: number | null) => {
    if (val === null) return '--'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const formatPercent = (val: number | null) => {
    if (val === null) return '0.00%'
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`
  }

  const getTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca atualizado'
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000)
    if (diff < 1) return 'Atualizado agora'
    return `Atualizado há ${diff} min`
  }

  return (
    <div 
      ref={cardRef}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={isActive}
      aria-label={`Ver histórico de ${quote.symbol}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      className={clsx(
        "cursor-pointer rounded-2xl p-5 transition-colors duration-300 border border-border-subtle flex flex-col h-full",
        isActive ? "bg-bg-primary ring-1 ring-accent" : "bg-bg-secondary hover:bg-bg-primary"
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-text-primary">{quote.symbol}</h3>
          <p className="text-sm text-text-secondary">{quote.name}</p>
        </div>
        <div className={clsx(
          "p-2 rounded-full",
          isPositive ? "bg-positive/10 text-positive" : 
          isNegative ? "bg-negative/10 text-negative" : "bg-border-subtle text-text-secondary"
        )}>
          {isPositive ? <TrendingUp size={20} /> : 
           isNegative ? <TrendingDown size={20} /> : <Minus size={20} />}
        </div>
      </div>

      <div className="flex justify-between items-end mb-2 flex-grow">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-text-primary tracking-tight">
            {formatPrice(quote.current_price)}
          </span>
          <span className={clsx(
            "text-sm font-medium",
            isPositive ? "text-positive" : isNegative ? "text-negative" : "text-text-secondary"
          )}>
            {formatPercent(quote.variation_percent)}
          </span>
        </div>
        
        <div className="flex-shrink-0">
          <Sparkline symbol={quote.symbol} isPositive={isPositive} />
        </div>
      </div>

      <div className="flex justify-between items-center mt-4">
        <p className="text-xs text-text-secondary">
          {getTimeAgo(quote.last_checked_at)}
        </p>
        {quote.market_status && (
          <span className="text-[10px] uppercase font-semibold tracking-wider text-text-secondary bg-border-subtle px-2 py-1 rounded-full">
            {quote.market_status}
          </span>
        )}
      </div>
    </div>
  )
}
