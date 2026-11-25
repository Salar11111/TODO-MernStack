import { useEffect, useState } from 'react';
import { flushQueue } from '../services/api';

const QUEUE_KEY = 'todo-offline-queue';

const readQueuedCount = () => {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(value) ? value.length : 0;
  } catch {
    return 0;
  }
};

const itemLabel = (count) => `${count} change${count === 1 ? '' : 's'}`;

// One honest banner: queued writes are on this device only until the server
// confirms them. Replay itself lives in the API client.
export function OfflineBanner() {
  const [browserOffline, setBrowserOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [apiDown, setApiDown] = useState(false);
  const [count, setCount] = useState(readQueuedCount);
  const [replaying, setReplaying] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    const handleApiAvailability = (event) => setApiDown(event.detail?.available === false);
    const handleQueue = (event) => {
      setCount(event.detail?.count ?? readQueuedCount());
      setSessionExpired(false);
      setExpiredCount(0);
    };
    const handleReplay = (event) => setReplaying(event.detail?.active === true);
    const handleExpired = () => {
      setSessionExpired(true);
      setExpiredCount(0);
    };
    const handleQueueExpired = (event) => {
      setSessionExpired(true);
      setExpiredCount(event.detail?.count || 0);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('api-availability', handleApiAvailability);
    window.addEventListener('api-queue', handleQueue);
    window.addEventListener('api-queue-replay', handleReplay);
    window.addEventListener('auth-expired', handleExpired);
    window.addEventListener('api-queue-expired', handleQueueExpired);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('api-availability', handleApiAvailability);
      window.removeEventListener('api-queue', handleQueue);
      window.removeEventListener('api-queue-replay', handleReplay);
      window.removeEventListener('auth-expired', handleExpired);
      window.removeEventListener('api-queue-expired', handleQueueExpired);
    };
  }, []);

  if (sessionExpired) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 bg-red-700 px-4 py-2 text-center text-sm font-medium text-white" role="alert">
        Session expired. {expiredCount > 0 && `${itemLabel(expiredCount)} could not be saved and were discarded. `}
        Please sign in again.
      </div>
    );
  }

  if (count > 0) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white" role="status" aria-live="polite">
        {replaying
          ? `Sending ${itemLabel(count)} to the server…`
          : `${itemLabel(count)} waiting to sync on this device. Nothing is saved on the server yet — we'll send ${count === 1 ? 'it' : 'them'} automatically when the server is reachable.`}
        {!replaying && (
          <button
            type="button"
            onClick={() => void flushQueue()}
            className="ml-2 underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Retry now
          </button>
        )}
      </div>
    );
  }

  if (browserOffline || apiDown) {
    return (
      <div className="fixed inset-x-0 top-0 z-50 bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white" role="status" aria-live="polite">
        Can&apos;t reach the server. Changes cannot be saved until the connection is back.
      </div>
    );
  }

  return null;
}

export default OfflineBanner;
