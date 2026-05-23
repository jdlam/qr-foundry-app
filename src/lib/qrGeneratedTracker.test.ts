import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsAdapter } from '@platform';
import {
  fireQrGeneratedIfNew,
  _resetQrGeneratedTrackerForTests,
} from './qrGeneratedTracker';

const mockedAnalytics = vi.mocked(analyticsAdapter);

describe('qrGeneratedTracker', () => {
  beforeEach(() => {
    _resetQrGeneratedTrackerForTests();
    vi.clearAllMocks();
  });

  // The dedup contract is the whole reason this helper exists. The goal is
  // "one event per QR the user actually commits to", not one event per click.
  it('fires once on first commit for a given (input_type, content) pair', () => {
    fireQrGeneratedIfNew('url', 'https://example.com', 'validate');

    expect(mockedAnalytics.track).toHaveBeenCalledTimes(1);
    expect(mockedAnalytics.track).toHaveBeenCalledWith('qr_generated', {
      input_type: 'url',
      committed_via: 'validate',
    });
  });

  it('does not fire again for the same (input_type, content) on subsequent commits', () => {
    fireQrGeneratedIfNew('url', 'https://example.com', 'validate');
    fireQrGeneratedIfNew('url', 'https://example.com', 'export');
    fireQrGeneratedIfNew('url', 'https://example.com', 'copy');

    expect(mockedAnalytics.track).toHaveBeenCalledTimes(1);
  });

  it('fires again when the content changes', () => {
    fireQrGeneratedIfNew('url', 'https://example.com', 'validate');
    fireQrGeneratedIfNew('url', 'https://other.com', 'validate');

    expect(mockedAnalytics.track).toHaveBeenCalledTimes(2);
  });

  it('fires again when the input type changes (even if content is identical)', () => {
    // Edge case: WiFi QR with content "PASSWORD123" and a text QR with the
    // same content are different QRs. The signature must include input_type.
    fireQrGeneratedIfNew('wifi', 'PASSWORD123', 'export');
    fireQrGeneratedIfNew('text', 'PASSWORD123', 'export');

    expect(mockedAnalytics.track).toHaveBeenCalledTimes(2);
  });

  it('does not send the content as an event property (it is PII)', () => {
    fireQrGeneratedIfNew('wifi', 'MyHomeWiFiPassword!', 'export');

    const call = mockedAnalytics.track.mock.calls[0];
    expect(call[0]).toBe('qr_generated');
    expect(JSON.stringify(call[1])).not.toContain('MyHomeWiFiPassword');
  });
});
