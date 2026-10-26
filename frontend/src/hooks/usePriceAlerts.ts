import { useState, useEffect } from 'react';

interface AlertConfig {
  symbol: string;
  threshold: number;
  type: 'above' | 'below';
}

export function usePriceAlerts(quotes: any[]) {
  const [alerts, setAlerts] = useState<AlertConfig[]>(() => {
    try {
      const saved = localStorage.getItem('fin-alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    localStorage.setItem('fin-alerts', JSON.stringify(alerts));
  }, [alerts]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setPermission(perm);
    }
  };

  useEffect(() => {
    if (permission !== 'granted' || !quotes || quotes.length === 0) return;

    alerts.forEach(alert => {
      const quote = quotes.find(q => q.symbol === alert.symbol);
      if (!quote || quote.current_price === null) return;

      const triggered = 
        (alert.type === 'above' && quote.current_price >= alert.threshold) ||
        (alert.type === 'below' && quote.current_price <= alert.threshold);

      if (triggered) {
        // Optional: debounce or mark as fired to avoid spam
        const key = `alert-fired-${alert.symbol}-${alert.threshold}`;
        if (!localStorage.getItem(key)) {
          new Notification(`Alerta: ${alert.symbol}`, {
            body: `O preço cruzou ${alert.threshold} e está agora em ${quote.current_price}`,
            icon: '/vite.svg'
          });
          localStorage.setItem(key, 'true');
        }
      }
    });
  }, [quotes, alerts, permission]);

  const addAlert = (alert: AlertConfig) => setAlerts([...alerts, alert]);
  const removeAlert = (idx: number) => setAlerts(alerts.filter((_, i) => i !== idx));

  return { alerts, addAlert, removeAlert, permission, requestPermission };
}
