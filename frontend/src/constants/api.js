export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/v1/auth/register`,
    LOGIN: `${API_BASE_URL}/api/v1/auth/login`,
    ME: `${API_BASE_URL}/api/v1/auth/me`,
  },
  CHAT: {
    ASK: `${API_BASE_URL}/api/v1/chat/ask`,
  },
};

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'docsy_token',
};