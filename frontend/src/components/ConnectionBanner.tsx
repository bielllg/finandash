import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export default function ConnectionBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-negative text-white py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium z-50">
      <WifiOff size={16} />
      Você está offline. Exibindo dados em cache.
    </div>
  );
}
