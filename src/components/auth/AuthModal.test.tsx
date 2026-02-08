import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { useAuthStore } from '../../stores/authStore';
import { ApiError } from '../../api/billing';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    plan: null,
    token: null,
    isLoading: false,
    isAuthenticating: false,
  });
});

describe('AuthModal', () => {
  it('renders sign in form when open', () => {
    render(<AuthModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('toggles between login and signup mode', () => {
    render(<AuthModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByText("Don't have an account? Sign up"));

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Already have an account? Sign in'));

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('calls login on form submit in login mode', async () => {
    const loginMock = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      login: loginMock,
      signup: vi.fn(),
      logout: vi.fn(),
      isAuthenticating: false,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    const onOpenChange = vi.fn();
    render(<AuthModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('calls signup on form submit in signup mode', async () => {
    const signupMock = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      login: vi.fn(),
      signup: signupMock,
      logout: vi.fn(),
      isAuthenticating: false,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    render(<AuthModal open={true} onOpenChange={() => {}} />);

    fireEvent.click(screen.getByText("Don't have an account? Sign up"));
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(signupMock).toHaveBeenCalledWith('new@example.com', 'password123');
    });
  });

  it('shows error message on API failure', async () => {
    const loginMock = vi.fn().mockRejectedValue(new ApiError('Invalid credentials', 401));
    useAuthStore.setState({
      login: loginMock,
      signup: vi.fn(),
      logout: vi.fn(),
      isAuthenticating: false,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    render(<AuthModal open={true} onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('shows generic error for non-API errors', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('Network failed'));
    useAuthStore.setState({
      login: loginMock,
      signup: vi.fn(),
      logout: vi.fn(),
      isAuthenticating: false,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    render(<AuthModal open={true} onOpenChange={() => {}} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument();
    });
  });

  it('shows loading state during authentication', () => {
    useAuthStore.setState({
      isAuthenticating: true,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    render(<AuthModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByText('Please wait...')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<AuthModal open={false} onOpenChange={() => {}} />);

    expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument();
  });
});
