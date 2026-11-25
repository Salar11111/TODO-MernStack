import { useCallback, useEffect, useState } from 'react';
import { authApi, clearOfflineQueue } from '../services/api';
import { AuthContext } from '../context/authContext';

const USER_KEY = 'todo-user';
const TOKEN_KEY = 'todo-token';

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || null);
  const [userChecked, setUserChecked] = useState(false);

  const persistAuth = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
    if (nextUser) localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    else localStorage.removeItem(USER_KEY);
  }, []);

  // Validate the stored token on first load / whenever it changes.
  // Without a stored session we never call /auth/me, so anonymous visitors do
  // not produce a 401; authApi.me() has the same guard for other callers.
  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (cancelled) return;
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch((err) => {
        if (cancelled) return;
        // An unreachable server is not proof the session is invalid. Keep the
        // stored user so pending offline writes can still replay on reconnect.
        if (!err.response || err.response.status >= 500) {
          setUserChecked(true);
          return;
        }
        persistAuth(null, null);
      })
      .finally(() => {
        if (!cancelled) setUserChecked(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token, persistAuth]);

  // Listen for forced logout from the API interceptor (refresh failed)
  useEffect(() => {
    const handleExpired = () => {
      setUserChecked(true);
      persistAuth(null, null);
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, [persistAuth]);

  // Only block the app while we have a token we haven't verified yet
  const initializing = Boolean(token) && !userChecked;

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    // Any queued writes belonged to a previous session; do not replay them
    // under a new identity.
    clearOfflineQueue();
    persistAuth(res.data.token, res.data.user);
    setUserChecked(true);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    clearOfflineQueue();
    persistAuth(res.data.token, res.data.user);
    setUserChecked(true);
    return res.data.user;
  };

  const logout = useCallback(async () => {
    // Best-effort server logout (clears refresh cookie). Ignore network errors.
    try {
      await authApi.logout();
    } catch {
      // Ignore - we clear local state regardless
    }
    // Queued changes are tied to the session that is ending.
    clearOfflineQueue();
    setUserChecked(false);
    persistAuth(null, null);
  }, [persistAuth]);

  return (
    <AuthContext.Provider value={{ user, token, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
