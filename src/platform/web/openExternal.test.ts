import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openExternalAdapter } from './openExternal';

describe('web openExternalAdapter', () => {
  const TEST_URL = 'https://checkout.stripe.com/pay/cs_test_abc';

  // jsdom's window.location.assign is non-configurable, so vi.spyOn can't wrap
  // it directly. Swap in a minimal location stub carrying a mock assign for the
  // duration of each test, then restore the real one.
  const realLocation = window.location;
  let assignMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    assignMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, assign: assignMock },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: realLocation,
    });
  });

  it('navigates the current tab to the URL', async () => {
    await openExternalAdapter.open(TEST_URL);

    expect(assignMock).toHaveBeenCalledWith(TEST_URL);
  });

  it('does not open a new tab', async () => {
    // Same-tab is deliberate: Stripe redirects back to our origin with
    // ?upgrade=success, which usePlanRefetchOnReturn reads on mount. A new tab
    // would land the entitlement in a second tab while this one stayed stale,
    // so opening one must NOT regress back in.
    const openSpy = vi.spyOn(window, 'open');

    await openExternalAdapter.open(TEST_URL);

    expect(openSpy).not.toHaveBeenCalled();
  });
});
