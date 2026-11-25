import axios from 'axios';

// Same-origin by default (Vite proxy / API's static hosting). VITE_API_URL can
// point a production build at an API on another origin, e.g. http://localhost:5011/api.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const TOKEN_KEY = 'todo-token';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Send refresh token cookies
});

// ---- Offline write queue -------------------------------------------------
// Only failed mutations are kept. Reads are never queued, so stale reads never
// replay as writes. The queue lives in localStorage so it survives a reload.
const QUEUE_KEY = 'todo-offline-queue';
const MAX_QUEUED = 50;
const DEDUPE_WINDOW_MS = 5000;
const HEALTH_INTERVAL_MS = 5000;
const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
// Auth writes must stay explicit: an old login/register must not silently run
// later, and the refresh call must never be queued.
const NO_QUEUE_PATHS = ['/auth/', '/health'];

const dispatch = (name, detail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

const readQueue = () => {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue) => {
  const next = queue.slice(0, MAX_QUEUED);
  try {
    if (next.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Storage can be disabled/full: the in-memory request still fails honestly.
  }
  dispatch('api-queue', { count: next.length });
  if (next.length) startHealthPolling();
  else stopHealthPolling();
};

// Axios serialises request bodies before the response interceptor sees them.
// Store a plain value so localStorage stays readable and replay re-serialises it.
const plainData = (data) => {
  if (typeof data !== 'string') return data ?? null;
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const signature = (item) => `${item.method} ${item.url} ${JSON.stringify(item.data ?? null)}`;

const enqueue = (config) => {
  const method = (config.method || 'get').toUpperCase();
  const url = config.url || '';
  if (!WRITE_METHODS.includes(method) || NO_QUEUE_PATHS.some((path) => url.includes(path))) {
    return false;
  }
  if (config._offlineReplay) return false;

  const item = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    method,
    url,
    data: plainData(config.data),
    createdAt: Date.now(),
  };

  const queue = readQueue();
  // React Query or a double-click can fire an identical request twice; keep
  // only one copy within a short window.
  const duplicate = queue.some(
    (queued) => signature(queued) === signature(item) && Date.now() - (queued.createdAt || 0) < DEDUPE_WINDOW_MS
  );
  if (!duplicate) writeQueue([...queue, item]);
  return true; // it is queued (or an identical copy already is)
};

// Broadcast reachability changes so the UI can show one honest banner.
let serverAvailable = true;
const setServerAvailable = (available) => {
  if (serverAvailable === available || typeof window === 'undefined') return;
  serverAvailable = available;
  dispatch('api-availability', { available });
};

export const pingServer = () => api.get('/health', { _noQueue: true });

let healthTimer = null;
function startHealthPolling() {
  if (typeof window === 'undefined' || healthTimer !== null) return;
  healthTimer = window.setInterval(() => {
    if (!readQueue().length) {
      stopHealthPolling();
      return;
    }
    // A successful ping is noticed by the response interceptor, which flushes.
    pingServer().catch(() => {});
  }, HEALTH_INTERVAL_MS);
}

function stopHealthPolling() {
  if (typeof window === 'undefined' || healthTimer === null) return;
  window.clearInterval(healthTimer);
  healthTimer = null;
}

// Replay sequentially. "flushing" doubles as a lock so online events, health
// pings and successful requests can all ask for a replay without duplicating it.
let flushing = null;
export function flushQueue() {
  if (flushing) return flushing;
  if (!readQueue().length) return Promise.resolve();

  flushing = (async () => {
    dispatch('api-queue-replay', { active: true });
    try {
      for (;;) {
        const queue = readQueue();
        if (!queue.length) break;
        const item = queue[0];
        try {
          await api({ method: item.method, url: item.url, data: item.data ?? null, _offlineReplay: true });
          // Server confirmed: remove only this item (new writes may be added).
          writeQueue(readQueue().filter((queued) => queued.id !== item.id));
        } catch (err) {
          if (err.response?.status === 401) {
            // Session expired: the remaining changes belong to the old session.
            const dropped = readQueue().length;
            writeQueue([]);
            dispatch('api-queue-expired', { count: dropped });
            break;
          }
          // Network failure or a 5xx (e.g. the dev proxy's ECONNREFUSED 500):
          // the server is still unavailable, so keep the item for the next retry.
          if (!err.response || err.response.status >= 500) break;
          // A definitive 4xx would only loop; drop it instead.
          writeQueue(readQueue().filter((queued) => queued.id !== item.id));
        }
      }
    } finally {
      flushing = null;
      dispatch('api-queue-replay', { active: false });
    }
  })();

  return flushing;
}

export function clearOfflineQueue() {
  writeQueue([]);
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    // The browser says we're online, but only a successful server response
    // proves it. Both paths are guarded against duplicate replays.
    pingServer().catch(() => {});
    void flushQueue();
  });
}

// Attach the JWT access token to every request if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth calls that must never trigger a refresh loop. "/auth/me" is deliberately
// absent: it is the request that normally detects an expired access token.
const NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/logout',
];

// Track refresh state to avoid multiple simultaneous refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Normalize errors into friendly messages
api.interceptors.response.use(
  (response) => {
    setServerAvailable(true);
    // Any successful call (notably the health ping) proves connectivity.
    if (!response.config?._offlineReplay && readQueue().length) void flushQueue();
    return response;
  },
  async (error) => {
    const originalRequest = error.config || {};

    // Network error or a server-side failure (including the dev proxy's 500
    // when the API is down): queue writes, never reads. 4xx validation/auth
    // errors are surfaced, not queued.
    if (!error.response || error.response.status >= 500) {
      setServerAvailable(false);
      if (enqueue(originalRequest)) {
        error.queued = true;
        error.message = 'Server unreachable — change queued on this device. It is not saved on the server yet.';
      } else {
        error.message = 'Network error. Please check your connection.';
      }
      return Promise.reject(error);
    }

    // Attempt to refresh the access token on 401 (once per request)
    const skipRefresh = NO_REFRESH_PATHS.some((path) => originalRequest.url?.includes(path));
    if (error.response.status === 401 && !originalRequest._retry && !skipRefresh) {
      if (isRefreshing) {
        // Queue this request until the ongoing refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use the configured instance so a custom VITE_API_URL is honoured and
        // the refresh cookie is sent with credentials.
        const res = await api.post('/auth/refresh', {}, { withCredentials: true });
        const newToken = res.data.token;
        localStorage.setItem(TOKEN_KEY, newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear stored auth; the UI will redirect to login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('todo-user');
        dispatch('auth-expired');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Prefer the server's message (validation/auth failures), with friendly
    // fallbacks so toasts never show raw Axios status text.
    const status = error.response.status;
    const serverMessage = error.response.data?.message;
    if (typeof serverMessage === 'string' && serverMessage) {
      error.message = serverMessage;
    } else if (status === 401) {
      error.message = 'Session expired. Please log in again.';
    } else if (status === 404) {
      error.message = 'Not found';
    } else if (status >= 500) {
      error.message = 'Server error. Please try again later.';
    } else {
      error.message = 'Request failed. Please try again.';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  // Never hit /auth/me without a stored session: anonymous visitors must not
  // generate a 401. Session restore still works for signed-in users.
  me: () => {
    if (!localStorage.getItem(TOKEN_KEY)) {
      const error = new Error('No active session');
      error.name = 'NoSessionError';
      return Promise.reject(error);
    }
    return api.get('/auth/me');
  },
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

export const todoApi = {
  list: (params) => api.get('/todos', { params }),
  create: (data) => api.post('/todos', data),
  update: (id, data) => api.put(`/todos/${id}`, data),
  remove: (id) => api.delete(`/todos/${id}`),
  bulkUpdate: (ids, patch) => api.put('/todos/bulk', { ids, patch }),
  bulkDelete: (ids) => api.delete('/todos/bulk', { data: { ids } }),
  reorder: (orderedIds) => api.put('/todos/reorder', { orderedIds }),
  stats: () => api.get('/todos/stats'),
};

// Fetch every todo for the current user by walking the paginated API.
// Used by views that need the full set (Kanban, Calendar, export).
export async function fetchAllTodos() {
  const pageSize = 100;
  let page = 1;
  let all = [];

  for (;;) {
    const { data } = await todoApi.list({ page, limit: pageSize });
    all = all.concat(data.todos);
    if (page >= data.pagination.pages || data.todos.length === 0) break;
    page += 1;
  }

  return all;
}

export const categoryApi = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
  reorder: (orderedIds) => api.put('/categories/reorder', { orderedIds }),
};

export default api;
