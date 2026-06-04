import { create } from 'zustand';
import { api } from '../lib/api';
import { LOCAL_STORAGE_KEYS } from '../constants/api';

export const useAuthStore = create((set, get) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('auth-unauthorized', () => {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      set({ token: null, user: null, isAuthenticated: false, error: 'Session expired. Please log in again.' });
    });
  }

  return {
    user: null,
    token: localStorage.getItem(LOCAL_STORAGE_KEYS.TOKEN) || null,
    isAuthenticated: false,
    loading: false,
    error: null,

  setError: (error) => set({ error }),

  checkAuth: async (force = false) => {
    if (get().loading && !force) {
      return get().isAuthenticated;
    }
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return false;
    }

    set({ loading: true, error: null });
    try {
      const data = await api.get('/api/v1/auth/me');
      set({
        user: {
          id: data.id,
          email: data.email,
          name: data.full_name || data.email.split('@')[0],
          role: data.role || 'user',
        },
        isAuthenticated: true,
        loading: false,
      });
      return true;
    } catch (err) {
      console.error('Failed to validate token:', err);
      // Clean up invalid tokens
      localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
      set({ token: null, user: null, isAuthenticated: false, loading: false });
      return false;
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/api/v1/auth/login', { email, password });
      const accessToken = data.access_token;
      
      if (!accessToken) {
        throw new Error('No access token received.');
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEYS.TOKEN, accessToken);
      set({ token: accessToken });
      
      const success = await get().checkAuth(true);
      return success;
    } catch (err) {
      set({ error: err.message || 'Login failed', loading: false });
      return false;
    }
  },

  register: async (email, name, password) => {
    set({ loading: true, error: null });
    try {
      await api.post('/api/v1/auth/register', {
        email,
        full_name: name,
        password,
      });
      // auto login after registration
      const loggedIn = await get().login(email, password);
      return loggedIn;
    } catch (err) {
      set({ error: err.message || 'Registration failed', loading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.TOKEN);
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
      loading: false,
    });
  },
  };
});
