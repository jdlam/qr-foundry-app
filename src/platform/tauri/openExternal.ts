import { openUrl } from '@tauri-apps/plugin-opener';
import type { OpenExternalAdapter } from '../types';

export const openExternalAdapter: OpenExternalAdapter = {
  // Hand off to the OS default browser. Stripe checkout must run in a real
  // browser, not the Tauri webview — payment flows depend on a trusted,
  // cookie-capable browser context.
  async open(url: string): Promise<void> {
    await openUrl(url);
  },
};
