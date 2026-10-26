import { useState, useEffect } from 'react';

const DEFAULT_WATCHLIST = ['BTC', 'PETR4', 'USD', 'EUR'];

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fin-watchlist');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse watchlist from localStorage', e);
    }
    return DEFAULT_WATCHLIST;
  });

  useEffect(() => {
    localStorage.setItem('fin-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  const addAsset = (symbol: string) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const removeAsset = (symbol: string) => {
    if (watchlist.length > 1) { // Prevent empty watchlist
      setWatchlist(watchlist.filter(s => s !== symbol));
    }
  };

  return { watchlist, addAsset, removeAsset };
}
