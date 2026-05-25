import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

// --- APP-F11: intercept Dialog.Content and Dialog.Root props at mock time ---
// vi.mock is hoisted above imports so the wrapped components are what AuthModal
// receives when it imports @radix-ui/react-dialog. We capture the last props
// passed to Dialog.Content and Dialog.Root so individual tests can inspect them.
//
// WHY we mock at this level: Radix exports are frozen ESM namespaces —
// vi.spyOn cannot reassign their properties at runtime. vi.mock (hoisted) can.
// Dialog.Content is a forwardRef object, so we forward via React.createElement.
let _lastContentProps: Record<string, unknown> = {};
let _lastRootProps: Record<string, unknown> = {};

vi.mock('@radix-ui/react-dialog', async (importActual) => {
  const actual = await importActual<typeof import('@radix-ui/react-dialog')>();
  const React = await import('react');
  return {
    ...actual,
    Content: (props: Record<string, unknown>) => {
      _lastContentProps = props;
      return React.createElement(actual.Content, props as Parameters<typeof actual.Content>[0]);
    },
    Root: (props: Record<string, unknown>) => {
      _lastRootProps = props;
      return actual.Root(props as Parameters<typeof actual.Root>[0]);
    },
  };
});

beforeEach(() => {
  _lastContentProps = {};
  _lastRootProps = {};
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

// --- APP-F11: Password-manager / outside-interaction dismiss hardening ---
//
// WHY these tests exist: password managers (1Password, Bitwarden, browser
// autofill) inject UI outside the Radix portal. Radix's DismissableLayer
// treats that as an outside interaction and fires onOpenChange(false), which
// was also calling resetForm() — wiping typed credentials and closing the
// modal. This blocks login/signup for a large fraction of users.
//
// Fix contract:
//   1. Dialog.Content receives onInteractOutside and onFocusOutside handlers
//      that call e.preventDefault(), so no outside-interaction event can
//      dismiss the modal.
//   2. resetForm() is removed from the onOpenChange(false) path so a Radix-
//      originated dismiss (e.g. Escape key, outside click before fix) cannot
//      wipe typed credentials.
//   3. X button still closes the modal.
//   4. Form is cleared on successful submit (happy-path reset preserved).
//
// NOTE on test strategy: Radix DismissableLayer fires custom synthetic events
// that jsdom cannot reproduce via standard DOM APIs. Tests 1 and 2 therefore
// verify the fix at the prop-wiring level (captured via vi.mock wrapping above).
// Test 3 verifies credential survival by directly invoking Dialog.Root's
// onOpenChange prop with false — the exact call path Radix uses internally
// when it decides to dismiss. Tests 4 and 5 are full DOM-interaction tests.

describe('AuthModal — password-manager / outside-interaction hardening (APP-F11)', () => {
  it('Dialog.Content receives onInteractOutside handler that calls e.preventDefault — blocks password-manager icon clicks from closing the modal', () => {
    render(<AuthModal open={true} onOpenChange={() => {}} />);

    const onInteractOutside = _lastContentProps.onInteractOutside as
      | ((e: { preventDefault: () => void }) => void)
      | undefined;

    expect(
      onInteractOutside,
      'Dialog.Content must receive an onInteractOutside prop so Radix DismissableLayer cannot close the modal on outside interaction',
    ).toBeDefined();

    const preventDefaultSpy = vi.fn();
    onInteractOutside!({ preventDefault: preventDefaultSpy });

    expect(
      preventDefaultSpy,
      'onInteractOutside must call e.preventDefault() to prevent password-manager icon clicks from dismissing the modal',
    ).toHaveBeenCalledOnce();
  });

  it('Dialog.Content receives onFocusOutside handler that calls e.preventDefault — blocks autofill focus from closing the modal', () => {
    render(<AuthModal open={true} onOpenChange={() => {}} />);

    const onFocusOutside = _lastContentProps.onFocusOutside as
      | ((e: { preventDefault: () => void }) => void)
      | undefined;

    expect(
      onFocusOutside,
      'Dialog.Content must receive an onFocusOutside prop so focus moving to autofill dropdown cannot close the modal',
    ).toBeDefined();

    const preventDefaultSpy = vi.fn();
    onFocusOutside!({ preventDefault: preventDefaultSpy });

    expect(
      preventDefaultSpy,
      'onFocusOutside must call e.preventDefault() to prevent autofill-focus from dismissing the modal',
    ).toHaveBeenCalledOnce();
  });

  it('typed credentials are NOT cleared when Dialog.Root fires onOpenChange(false) — Radix dismiss path must not wipe the form', () => {
    // WHY: the bug path is Radix calling the onOpenChange prop on Dialog.Root
    // with false when DismissableLayer fires a dismiss event (pointer down
    // outside, focus outside). The previous code wired resetForm() into that
    // handler, so any dismiss — including password-manager icon clicks —
    // would clear the email and password fields. After the fix, onOpenChange
    // must NOT call resetForm().
    //
    // We reproduce the exact Radix call path by capturing Dialog.Root's
    // onOpenChange prop (via the vi.mock wrapper above) and invoking it
    // directly with false, then asserting the fields are still populated.
    render(<AuthModal open={true} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } });

    // Invoke Dialog.Root's onOpenChange with false — the exact call Radix
    // makes when the DismissableLayer decides to dismiss.
    const rootOnOpenChange = _lastRootProps.onOpenChange as
      | ((open: boolean) => void)
      | undefined;

    expect(rootOnOpenChange, 'Dialog.Root must have onOpenChange wired').toBeDefined();

    act(() => {
      rootOnOpenChange!(false);
    });

    // Fields must still contain the typed values — resetForm was not called.
    expect(
      (screen.getByLabelText('Email') as HTMLInputElement).value,
      'Email must survive a Radix-originated onOpenChange(false) — no resetForm on dismiss',
    ).toBe('user@example.com');
    expect(
      (screen.getByLabelText('Password') as HTMLInputElement).value,
      'Password must survive a Radix-originated onOpenChange(false) — no resetForm on dismiss',
    ).toBe('hunter2');
  });

  it('X button still closes the modal', () => {
    const onOpenChange = vi.fn();
    render(<AuthModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('form is cleared after a successful login — reset-on-success is preserved by the fix', async () => {
    // WHY: after the fix resetForm() must still run on successful submit so
    // that re-opening the modal presents a blank form. This test confirms the
    // happy-path reset is intact.
    const loginMock = vi.fn().mockResolvedValue(undefined);
    useAuthStore.setState({
      login: loginMock,
      signup: vi.fn(),
      logout: vi.fn(),
      isAuthenticating: false,
      isLoggedIn: () => false,
    } as unknown as typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never);

    const onOpenChange = vi.fn();
    const { rerender } = render(<AuthModal open={true} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

    // Re-open the modal — fields must be blank (reset on success preserved).
    rerender(<AuthModal open={true} onOpenChange={onOpenChange} />);

    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  });
});
