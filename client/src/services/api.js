import axios from 'axios';

// Same-origin by default (Vite proxy / API's static hosting). VITE_API_URL can
// point a production build at an API on another origin, e.g. http://localhost:5011/api.
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  withCredentials: true, // Send refresh token cookies
});

// Attach the JWT access token to every request if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('todo-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Broadcast reachability changes so the UI can show one honest "server
// unavailable" banner (no offline queue is implied).
let serverAvailable = true;
const setServerAvailable = (available) => {
  if (serverAvailable === available || typeof window === 'undefined') return;
  serverAvailable = available;
  window.dispatchEvent(new CustomEvent('api-availability', { detail: { available } }));
};

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
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Network error
    if (!error.response) {
      setServerAvailable(false);
      error.message = 'Network error. Please check your connection.';
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
        localStorage.setItem('todo-token', newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear stored auth; the UI will redirect to login
        localStorage.removeItem('todo-token');
        localStorage.removeItem('todo-user');
        window.dispatchEvent(new CustomEvent('auth-expired'));
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
  me: () => api.get('/auth/me'),
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
