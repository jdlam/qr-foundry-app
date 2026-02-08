import { LazyStore } from '@tauri-apps/plugin-store';
import type { AuthAdapter } from '../types';

const store = new LazyStore('auth.json');
const TOKEN_KEY = 'jwt-token';

export const authAdapter: AuthAdapter = {
  async getToken() {
    return (await store.get<string>(TOKEN_KEY)) ?? null;
  },

  async setToken(token: string) {
    await store.set(TOKEN_KEY, token);
    await store.save();
  },

  async clearToken() {
    await store.delete(TOKEN_KEY);
    await store.save();
  },
};
