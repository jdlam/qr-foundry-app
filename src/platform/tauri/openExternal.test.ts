import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @tauri-apps/plugin-opener before importing the adapter so the module
// never tries to resolve the real Tauri plugin (not available in jsdom).
const mockOpenUrl = vi.fn();
vi.mock('@tauri-apps/plugin-opener', () => ({
  openUrl: mockOpenUrl,
}));

// Import after the mock is registered.
const { openExternalAdapter } = await import('./openExternal');

describe('tauri openExternalAdapter', () => {
  const TEST_URL = 'https://checkout.stripe.com/pay/cs_test_tauri';

  beforeEach(() => {
    mockOpenUrl.mockReset();
    mockOpenUrl.mockResolvedValue(undefined);
  });

  it('delegates to openUrl from @tauri-apps/plugin-opener', async () => {
    // Stripe checkout must run in the real system browser, not the Tauri webview.
    // Payment flows depend on a trusted, cookie-capable browser context that the
    // embedded webview cannot guarantee.
    await openExternalAdapter.open(TEST_URL);

    expect(mockOpenUrl).toHaveBeenCalledWith(TEST_URL);
    expect(mockOpenUrl).toHaveBeenCalledOnce();
  });

  it('propagates errors from openUrl so callers can toast and reset in-flight state', async () => {
    // If the OS fails to open the browser (no default browser configured, etc.)
    // the error must bubble up rather than silently leaving checkoutInFlight set.
    mockOpenUrl.mockRejectedValue(new Error('No browser available'));

    await expect(openExternalAdapter.open(TEST_URL)).rejects.toThrow('No browser available');
  });
});
