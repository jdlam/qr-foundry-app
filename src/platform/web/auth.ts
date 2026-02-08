import type { AuthAdapter } from '../types';

const STORAGE_KEY = 'qr-foundry-token';

export const authAdapter: AuthAdapter = {
  async getToken() {
    return localStorage.getItem(STORAGE_KEY);
  },

  async setToken(token: string) {
    localStorage.setItem(STORAGE_KEY, token);
  },

  async clearToken() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
