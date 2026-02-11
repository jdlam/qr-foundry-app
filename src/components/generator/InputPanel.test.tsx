import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InputPanel } from './InputPanel';
import { useQrStore } from '../../stores/qrStore';

// Mock useAuth hook (still needed by components that import it)
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    plan: null,
    isLoggedIn: false,
    isLoading: false,
    isAuthenticating: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  }),
}));

describe('InputPanel', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
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

  it('does not show PRO badges (all types are free)', () => {
    render(<InputPanel />);

    expect(screen.queryByText('PRO')).not.toBeInTheDocument();
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

  it('switches to vCard input when vCard button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('vCard'));

    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
  });

  it('switches to Email input when Email button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('Email'));

    expect(screen.getByPlaceholderText('Recipient email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Subject')).toBeInTheDocument();
  });

  it('switches to SMS input when SMS button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('SMS'));

    expect(screen.getByPlaceholderText('Phone number')).toBeInTheDocument();
  });

  it('switches to Location input when Location button clicked', () => {
    render(<InputPanel />);

    fireEvent.click(screen.getByText('Location'));

    expect(screen.getByPlaceholderText('Latitude')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Longitude')).toBeInTheDocument();
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
