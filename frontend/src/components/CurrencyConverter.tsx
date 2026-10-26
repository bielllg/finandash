import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft } from 'lucide-react';
import { api } from '../lib/api';

export default function CurrencyConverter() {
  const { data: quotes } = useQuery<any[]>({ 
    queryKey: ['quotes', 'current'],
    queryFn: async () => {
      const { data } = await api.get('/quotes/current')
      return data
    }
  });
  
  const [amount, setAmount] = useState<number | ''>(100);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('BRL');

  const currencies = {
    BRL: 1,
    USD: quotes?.find((q: any) => q.symbol === 'USD')?.current_price,
    EUR: quotes?.find((q: any) => q.symbol === 'EUR')?.current_price,
    BTC: quotes?.find((q: any) => q.symbol === 'BTC')?.current_price,
  };

  const source = currencies[from as keyof typeof currencies];
  const target = currencies[to as keyof typeof currencies];
  const converted = amount !== '' && source > 0 && target > 0 ? amount * source / target : null;

  return (
    <div className="bg-bg-secondary rounded-2xl p-6 shadow-xl border border-border-subtle mb-8">
      <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
        <ArrowRightLeft size={20} />
        Conversor Rápido
      </h3>
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 w-full relative">
          <input 
            type="number" 
            aria-label="Valor para converter" min="0"
            value={amount} 
            onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
            className="w-full bg-bg-primary border border-border-subtle rounded-lg px-4 py-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <select 
            value={from} 
            aria-label="Moeda de origem"
            onChange={(e) => setFrom(e.target.value)}
            className="absolute right-2 top-2 bottom-2 bg-transparent text-text-primary font-bold focus:outline-none"
          >
            {Object.keys(currencies).map(c => <option key={c} value={c} className="bg-bg-secondary text-text-primary">{c}</option>)}
          </select>
        </div>
        
        <div className="text-text-secondary bg-bg-primary p-2 rounded-full hidden md:block">
          <ArrowRightLeft size={16} />
        </div>

        <div className="flex-1 w-full relative">
          <input 
            type="text" 
            readOnly 
            aria-label="Resultado da conversão"
            value={converted === null ? 'Cotação indisponível' : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(converted)}
            className="w-full bg-bg-primary border border-border-subtle rounded-lg px-4 py-3 text-text-primary opacity-80 cursor-not-allowed"
          />
          <select 
            value={to} 
            aria-label="Moeda de destino"
            onChange={(e) => setTo(e.target.value)}
            className="absolute right-2 top-2 bottom-2 bg-transparent text-text-primary font-bold focus:outline-none"
          >
            {Object.keys(currencies).map(c => <option key={c} value={c} className="bg-bg-secondary text-text-primary">{c}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
