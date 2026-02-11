import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputPanel } from './InputPanel';
import { useQrStore } from '../../stores/qrStore';
import { useAuthModalStore } from '../../stores/authModalStore';

// Mock useAuth hook
let mockAuthState: Record<string, unknown> = {
  user: null,
  plan: null,
  isLoggedIn: false,
  isLoading: false,
  isAuthenticating: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

// Mock sonner toast
const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe('InputPanel', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
    mockAuthState = {
      user: null,
      plan: null,
      isLoggedIn: false,
      isLoading: false,
      isAuthenticating: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    };
    mockToast.mockReset();
    useAuthModalStore.getState().close();
  });

  it('renders all input type buttons', () => {
    render(<InputPanel />);

    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('WiFi')).toBeInTheDocument();
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('vCard')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('SMS')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('shows URL input by default', () => {
    render(<InputPanel />);

    const urlInput = screen.getByPlaceholderText('https://example.com');
    expect(urlInput).toBeInTheDocument();
  });

  it('switches to WiFi input when WiFi button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('WiFi'));

    expect(screen.getByPlaceholderText('Network name (SSID)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
  });

  it('switches to Text input when Text button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('Text'));

    expect(screen.getByPlaceholderText('Enter your text...')).toBeInTheDocument();
  });

  it('switches to Phone input when Phone button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('Phone'));

    expect(screen.getByPlaceholderText('+1 555-0123')).toBeInTheDocument();
  });

  describe('Feature gating — logged out', () => {
    it('opens auth modal when vCard is clicked while logged out', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('vCard'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
      // Should NOT switch to vCard input
      expect(screen.queryByPlaceholderText('First name')).not.toBeInTheDocument();
    });

    it('opens auth modal when Email is clicked while logged out', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('Email'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
      expect(screen.queryByPlaceholderText('Recipient email')).not.toBeInTheDocument();
    });

    it('opens auth modal when SMS is clicked while logged out', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('SMS'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it('opens auth modal when Location is clicked while logged out', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('Location'));

      expect(useAuthModalStore.getState().isOpen).toBe(true);
    });
  });

  describe('Feature gating — free tier', () => {
    beforeEach(() => {
      mockAuthState = {
        ...mockAuthState,
        user: { id: '1', email: 'test@example.com', createdAt: '2025-01-01' },
        plan: { tier: 'free', features: ['basic_qr_types'], maxCodes: 0 },
        isLoggedIn: true,
      };
    });

    it('shows upgrade toast when vCard is clicked on free tier', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('vCard'));

      expect(mockToast).toHaveBeenCalledWith('Upgrade to Pro to unlock this feature');
    });
  });

  describe('Feature gating — pro tier', () => {
    beforeEach(() => {
      mockAuthState = {
        ...mockAuthState,
        user: { id: '1', email: 'test@example.com', createdAt: '2025-01-01' },
        plan: { tier: 'pro', features: ['basic_qr_types', 'advanced_qr_types'], maxCodes: 0 },
        isLoggedIn: true,
      };
    });

    it('allows switching to Email input when has access', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('Email'));

      expect(screen.getByPlaceholderText('Recipient email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Subject')).toBeInTheDocument();
    });

    it('allows switching to vCard input when has access', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('vCard'));

      expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    });

    it('allows switching to SMS input when has access', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('SMS'));

      expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
    });

    it('allows switching to Location input when has access', () => {
      render(<InputPanel />);

      fireEvent.click(screen.getByText('Location'));

      expect(screen.getByPlaceholderText('Latitude')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Longitude')).toBeInTheDocument();
    });
  });

  it('updates content when URL input changes', () => {
    render(<InputPanel />);

    const urlInput = screen.getByPlaceholderText('https://example.com');
    fireEvent.change(urlInput, { target: { value: 'example.com' } });

    // Content should be updated with https:// prefix
    expect(useQrStore.getState().content).toBe('https://example.com');
  });

  it('updates content when text input changes', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('Text'));
    const textInput = screen.getByPlaceholderText('Enter your text...');
    fireEvent.change(textInput, { target: { value: 'Hello World' } });

    expect(useQrStore.getState().content).toBe('Hello World');
  });

  it('displays character count', () => {
    useQrStore.getState().setContent('https://example.com');
    render(<InputPanel />);

    expect(screen.getByText('19 chars')).toBeInTheDocument();
  });

  it('clears content when switching input types', () => {
    render(<InputPanel />);

    // Enter some URL content
    const urlInput = screen.getByPlaceholderText('https://example.com');
    fireEvent.change(urlInput, { target: { value: 'https://test.com' } });

    // Switch to WiFi
    fireEvent.click(screen.getByText('WiFi'));

    // Content should be cleared (WiFi format is different)
    expect(useQrStore.getState().content).toBe('');
  });

  describe('WiFi input', () => {
    beforeEach(() => {
      useQrStore.getState().setInputType('wifi');
    });

    it('renders WiFi-specific inputs', () => {
      render(<InputPanel />);

      expect(screen.getByPlaceholderText('Network name (SSID)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByText('Hidden network')).toBeInTheDocument();
    });

    it('updates SSID', () => {
      render(<InputPanel />);

      const ssidInput = screen.getByPlaceholderText('Network name (SSID)');
      fireEvent.change(ssidInput, { target: { value: 'MyNetwork' } });

      expect(useQrStore.getState().wifiConfig.ssid).toBe('MyNetwork');
    });

    it('updates password', () => {
      render(<InputPanel />);

      const passwordInput = screen.getByPlaceholderText('Password');
      fireEvent.change(passwordInput, { target: { value: 'secret123' } });

      expect(useQrStore.getState().wifiConfig.password).toBe('secret123');
    });

    it('updates hidden checkbox', () => {
      render(<InputPanel />);

      const hiddenCheckbox = screen.getByRole('checkbox');
      fireEvent.click(hiddenCheckbox);

      expect(useQrStore.getState().wifiConfig.hidden).toBe(true);
    });

    it('generates WiFi content format', () => {
      render(<InputPanel />);

      const ssidInput = screen.getByPlaceholderText('Network name (SSID)');
      fireEvent.change(ssidInput, { target: { value: 'TestNet' } });

      const passwordInput = screen.getByPlaceholderText('Password');
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });

      expect(useQrStore.getState().content).toContain('WIFI:');
      expect(useQrStore.getState().content).toContain('S:TestNet');
      expect(useQrStore.getState().content).toContain('P:pass123');
    });
  });

  describe('Email input', () => {
    beforeEach(() => {
      // Need pro access to reach email input via store
      mockAuthState = {
        ...mockAuthState,
        plan: { tier: 'pro', features: ['basic_qr_types', 'advanced_qr_types'], maxCodes: 0 },
        isLoggedIn: true,
      };
      useQrStore.getState().setInputType('email');
    });

    it('generates mailto: URL format', () => {
      render(<InputPanel />);

      const toInput = screen.getByPlaceholderText('Recipient email');
      fireEvent.change(toInput, { target: { value: 'test@example.com' } });

      expect(useQrStore.getState().content).toBe('mailto:test@example.com');
    });

    it('includes subject in mailto URL', () => {
      render(<InputPanel />);

      const toInput = screen.getByPlaceholderText('Recipient email');
      fireEvent.change(toInput, { target: { value: 'test@example.com' } });

      const subjectInput = screen.getByPlaceholderText('Subject');
      fireEvent.change(subjectInput, { target: { value: 'Hello' } });

      expect(useQrStore.getState().content).toContain('subject=Hello');
    });
  });

  describe('Phone input', () => {
    beforeEach(() => {
      useQrStore.getState().setInputType('phone');
    });

    it('generates tel: format', () => {
      render(<InputPanel />);

      const phoneInput = screen.getByPlaceholderText('+1 555-0123');
      fireEvent.change(phoneInput, { target: { value: '+15551234567' } });

      expect(useQrStore.getState().content).toBe('tel:+15551234567');
    });
  });

  describe('vCard input', () => {
    beforeEach(() => {
      // Need pro access to reach vcard input via store
      mockAuthState = {
        ...mockAuthState,
        plan: { tier: 'pro', features: ['basic_qr_types', 'advanced_qr_types'], maxCodes: 0 },
        isLoggedIn: true,
      };
      useQrStore.getState().setInputType('vcard');
    });

    it('generates vCard format', () => {
      render(<InputPanel />);

      const firstNameInput = screen.getByPlaceholderText('First name');
      fireEvent.change(firstNameInput, { target: { value: 'John' } });

      const lastNameInput = screen.getByPlaceholderText('Last name');
      fireEvent.change(lastNameInput, { target: { value: 'Doe' } });

      const content = useQrStore.getState().content;
      expect(content).toContain('BEGIN:VCARD');
      expect(content).toContain('N:Doe;John');
      expect(content).toContain('END:VCARD');
    });
  });
});
