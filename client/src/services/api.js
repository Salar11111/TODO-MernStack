import axios from 'axios';

// Base URL is served through the Vite dev proxy (/api -> http://localhost:5000)
const api = axios.create({
  baseURL: '/api',
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Network error
    if (!error.response) {
      error.message = 'Network error. Please check your connection.';
      return Promise.reject(error);
    }

    // Attempt to refresh the access token on 401 (once per request)
    if (error.response.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/')) {
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
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
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

    // Friendly messages for other statuses
    if (error.response.status === 400) {
      error.message = error.response.data?.message || 'Invalid request';
    } else if (error.response.status === 401) {
      error.message = 'Session expired. Please log in again.';
    } else if (error.response.status === 404) {
      error.message = 'Task not found';
    } else if (error.response.status >= 500) {
      error.message = 'Server error. Please try again later.';
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
