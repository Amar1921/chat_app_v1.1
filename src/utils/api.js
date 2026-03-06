import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api',
  timeout: 30000
});

// Intercepteur pour ajouter le token
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.NODE_ENV === 'development') {
    console.log(`🚀 ${config.method.toUpperCase()} ${config.url}`, config.data || '');
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Intercepteur pour gérer les erreurs
API.interceptors.response.use(
    response => {
      if (import.meta.env.NODE_ENV === 'development') {
        console.log('✅ Response:', response.data);
      }
      return response;
    },
    error => {
      if (import.meta.env.NODE_ENV === 'development') {
        console.error('❌ Error:', error.response?.data || error.message);
      }
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
      if (error.response?.status === 403) {
        console.error('Accès interdit');
      }
      if (error.response?.status >= 500) {
        console.error('Erreur serveur');
      }
      return Promise.reject(error);
    }
);

// ==================== AUTHENTIFICATION ====================
export const authAPI = {
  login: (data) => API.post('/auth/login', data),
  register: (data) => API.post('/auth/register', data),
  me: () => API.get('/auth/me'),
  updatePreferences: (data) => API.put('/auth/preferences', data),
  changePassword: (data) => API.put('/auth/password', data),
  refreshToken: () => API.post('/auth/refresh'),
  logout: () => API.post('/auth/logout'),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  checkEmail: (email) => API.get(`/auth/check-email/${email}`),
};

// ==================== CONVERSATIONS ====================
export const conversationsAPI = {
  list: (params = {}) => API.get('/conversations', { params }),
  create: (data) => API.post('/conversations', data),
  get: (id) => API.get(`/conversations/${id}`),
  update: (id, data) => API.put(`/conversations/${id}`, data),
  delete: (id) => API.delete(`/conversations/${id}`),
  archive: (id) => API.post(`/conversations/${id}/archive`),
  unarchive: (id) => API.post(`/conversations/${id}/unarchive`),
  share: (id) => API.post(`/conversations/${id}/share`),
  duplicate: (id) => API.post(`/conversations/${id}/duplicate`),
  export: (id, format = 'json') => API.get(`/conversations/${id}/export.${format}`, { responseType: 'blob' }),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return API.post('/conversations/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  search: (query) => API.get('/conversations/search', { params: { q: query } }),
  getStats: (id) => API.get(`/conversations/${id}/stats`),
  testSettings: (id, settings) => API.post(`/conversations/${id}/test`, settings),
  getDefaults: () => API.get('/conversations/defaults'),
  saveAsTemplate: (id, name) => API.post(`/conversations/${id}/template`, { name }),
  applyTemplate: (id, templateId) => API.post(`/conversations/${id}/apply-template`, { templateId }),
};

// ==================== CHAT & MESSAGES ====================
export const chatAPI = {
  /**
   * Envoyer un message en streaming (Server-Sent Events)
   * @param {string} conversationId
   * @param {string} content
   * @param {AbortSignal} signal - pour annuler le stream
   * @param {Function} onChunk
   * @param {Function} onReasoning
   * @param {Function} onDone
   * @param {Function} onError
   */
  async sendStream(conversationId, content, signal, onChunk, onReasoning, onDone, onError) {
    try {
      const token = localStorage.getItem('token');

      // ✅ FIX: REACT_APP_API_URL = "https://chat.amarsyll.pro/api"
      // On retire le /api final pour éviter /api/api/chat/...
      const apiRoot = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api';
      const baseURL = apiRoot.replace(/\/api\/?$/, ''); // → "https://chat.amarsyll.pro"

      const response = await fetch(`${baseURL}/api/chat/${conversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({ content, stream: true }),
        signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') { onDone?.(); continue; }
            if (data) {
              try {
                const parsed = JSON.parse(data);
                switch (parsed.type) {
                  case 'content':   onChunk?.(parsed.content);     break;
                  case 'reasoning': onReasoning?.(parsed.content); break;
                  case 'done':      onDone?.(parsed);              break;
                  case 'error':     onError?.(parsed.error);       break;
                  default: console.log('Unknown event type:', parsed);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e, 'Raw data:', data);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        onError?.('AbortError');
        return;
      }
      console.error('Stream error:', error);
      onError?.(error.message);
    }
  },

  sendMessage: (conversationId, data) => API.post(`/chat/${conversationId}`, data),
  generateWithSettings: (conversationId, content, settings) => API.post(`/chat/${conversationId}/generate`, { content, settings }),
  regenerate: (messageId) => API.post(`/chat/messages/${messageId}/regenerate`),
  bookmarkMessage: (id) => API.put(`/chat/messages/${id}/bookmark`),
  unbookmarkMessage: (id) => API.delete(`/chat/messages/${id}/bookmark`),
  reactToMessage: (id, reaction) => API.put(`/chat/messages/${id}/reaction`, { reaction }),
  removeReaction: (id) => API.delete(`/chat/messages/${id}/reaction`),
  getBookmarks: () => API.get('/chat/bookmarks/all'),
  editMessage: (id, content) => API.put(`/chat/messages/${id}`, { content }),
  deleteMessage: (id) => API.delete(`/chat/messages/${id}`),
  validateSettings: (settings) => API.post('/chat/validate-settings', settings),
  getHistory: (conversationId, params) => API.get(`/chat/${conversationId}/history`, { params }),
  searchMessages: (query) => API.get('/chat/search', { params: { q: query } }),
};

// ==================== STATISTIQUES & ANALYTICS ====================
export const statsAPI = {
  dashboard: () => API.get('/stats/dashboard'),
  usage: (params) => API.get('/stats/usage', { params }),
  topConversations: (limit = 10) => API.get('/stats/top-conversations', { params: { limit } }),
  modelStats: () => API.get('/stats/models'),
  dailyActivity: (days = 30) => API.get('/stats/daily-activity', { params: { days } }),
  getPrompts: () => API.get('/stats/prompts'),
  createPrompt: (data) => API.post('/stats/prompts', data),
  updatePrompt: (id, data) => API.put(`/stats/prompts/${id}`, data),
  deletePrompt: (id) => API.delete(`/stats/prompts/${id}`),
  getFolders: () => API.get('/stats/folders'),
  createFolder: (data) => API.post('/stats/folders', data),
  updateFolder: (id, data) => API.put(`/stats/folders/${id}`, data),
  deleteFolder: (id) => API.delete(`/stats/folders/${id}`),
  tokenUsage: (params) => API.get('/stats/tokens', { params }),
};

// ==================== MODÈLES ====================
export const modelsAPI = {
  list: () => API.get('/models'),
  get: (modelId) => API.get(`/models/${modelId}`),
  getDefaults: (modelId) => API.get(`/models/${modelId}/defaults`),
  validate: (modelId, settings) => API.post(`/models/${modelId}/validate`, settings),
  health: (modelId) => API.get(`/models/${modelId}/health`),
};

// ==================== UTILISATEURS ====================
export const usersAPI = {
  getProfile: () => API.get('/users/profile'),
  updateProfile: (data) => API.put('/users/profile', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return API.post('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteAvatar: () => API.delete('/users/avatar'),
  getNotifications: () => API.get('/users/notifications'),
  markNotificationRead: (id) => API.put(`/users/notifications/${id}/read`),
  markAllNotificationsRead: () => API.put('/users/notifications/read-all'),
  deleteNotification: (id) => API.delete(`/users/notifications/${id}`),
  getPreferences: () => API.get('/users/preferences'),
  updatePreferences: (preferences) => API.put('/users/preferences', preferences),
  deleteAccount: (data) => API.delete('/users/account', { data }),
};

// ==================== FICHIERS ====================
export const filesAPI = {
  upload: (file, conversationId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (conversationId) formData.append('conversation_id', conversationId);
    return API.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => console.log('Upload progress:', Math.round((e.loaded * 100) / e.total)),
    });
  },
  uploadMultiple: (files, conversationId) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (conversationId) formData.append('conversation_id', conversationId);
    return API.post('/files/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  list: (params) => API.get('/files', { params }),
  download: (fileId) => API.get(`/files/${fileId}/download`, { responseType: 'blob' }),
  delete: (fileId) => API.delete(`/files/${fileId}`),
  getInfo: (fileId) => API.get(`/files/${fileId}`),
  analyze: (fileId) => API.post(`/files/${fileId}/analyze`),
};

// ==================== ADMIN ====================
export const adminAPI = {
  systemStats: () => API.get('/admin/stats'),
  listUsers: (params) => API.get('/admin/users', { params }),
  updateUser: (userId, data) => API.put(`/admin/users/${userId}`, data),
  suspendUser: (userId) => API.post(`/admin/users/${userId}/suspend`),
  activateUser: (userId) => API.post(`/admin/users/${userId}/activate`),
  deleteUser: (userId) => API.delete(`/admin/users/${userId}`),
  getLogs: (params) => API.get('/admin/logs', { params }),
  getConfig: () => API.get('/admin/config'),
  updateConfig: (config) => API.put('/admin/config', config),
};

// ==================== HEALTH CHECK ====================
export const healthAPI = {
  check: () => API.get('/health'),
  detailed: () => API.get('/health/detailed'),
};

export default API;