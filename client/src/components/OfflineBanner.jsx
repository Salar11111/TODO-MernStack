import { useEffect, useState } from 'react';

// Shows a single, honest banner when the browser is offline or the API cannot
// be reached. No offline queue is implied: changes are not saved while hidden.
export function OfflineBanner() {
  const [browserOffline, setBrowserOffline] = useState(() => !navigator.onLine);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    const handleApiAvailability = (event) => {
      setApiDown(event.detail?.available === false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('api-availability', handleApiAvailability);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('api-availability', handleApiAvailability);
    };
  }, []);

  if (!browserOffline && !apiDown) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
      role="status"
      aria-live="polite"
    >
      Can&apos;t reach the server. Check your connection and try again.
    </div>
  );
}

export default OfflineBanner;
