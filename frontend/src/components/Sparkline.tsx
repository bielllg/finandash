import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface SparklineProps {
  symbol: string;
  isPositive: boolean;
}

export default function Sparkline({ symbol, isPositive }: SparklineProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['quotes', 'sparkline', symbol],
    queryFn: async () => {
      const { data } = await api.get(`/quotes/history/${symbol}?period=7d`);
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !data || data.length === 0) {
    return <div className="w-16 h-8 opacity-50 flex items-center justify-center">...</div>;
  }

  // Draw simple SVG line
  const prices = data.map((d: any) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1; // avoid division by zero

  const width = 64; // 16 * 4 (w-16)
  const height = 32; // 8 * 4 (h-8)

  const points = prices.map((price: number, i: number) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const strokeColor = isPositive ? 'var(--color-positive)' : 'var(--color-negative)';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
