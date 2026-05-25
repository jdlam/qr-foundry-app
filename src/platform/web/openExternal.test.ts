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

  it('opens the URL in a new tab with noopener,noreferrer', async () => {
    // Must use these flags so the Stripe tab cannot navigate back to our origin
    // via window.opener, and so the browser doesn't send a Referer header.
    const mockOpen = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    await openExternalAdapter.open(TEST_URL);

    expect(mockOpen).toHaveBeenCalledWith(TEST_URL, '_blank', 'noopener,noreferrer');
  });

  it('falls back to location.assign when window.open is blocked (returns null)', async () => {
    // Popup blockers return null from window.open. Without the fallback, the
    // user never reaches Stripe and the in-flight flag stays set forever.
    vi.spyOn(window, 'open').mockReturnValue(null);

    await openExternalAdapter.open(TEST_URL);

    expect(assignMock).toHaveBeenCalledWith(TEST_URL);
  });

  it('does NOT call location.assign when window.open succeeds', async () => {
    vi.spyOn(window, 'open').mockReturnValue({} as Window);

    await openExternalAdapter.open(TEST_URL);

    expect(assignMock).not.toHaveBeenCalled();
  });
});
