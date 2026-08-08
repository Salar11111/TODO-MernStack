import { useCallback, useEffect, useState } from 'react';
import { authApi } from '../services/api';
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

  // Validate the stored token on first load / whenever it changes
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
      .catch(() => {
        if (!cancelled) persistAuth(null, null);
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
    persistAuth(res.data.token, res.data.user);
    setUserChecked(true);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
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
    setUserChecked(false);
    persistAuth(null, null);
  }, [persistAuth]);

  return (
    <AuthContext.Provider value={{ user, token, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
