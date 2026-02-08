import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { useAuth } from '../../hooks/useAuth';
import { ApiError } from '../../api/billing';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { login, signup, isAuthenticating } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (mode === 'login') {
        await login(email, password);
        toast.success('Signed in successfully');
      } else {
        await signup(email, password);
        toast.success('Account created — your 7-day Pro trial has started!');
      }
      resetForm();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-sm p-6 shadow-lg"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
          }}
        >
          <Dialog.Title
            className="text-base font-semibold mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
                htmlFor="auth-email"
              >
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all border-2 focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                className="text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
                htmlFor="auth-password"
              >
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all border-2 focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
                placeholder={mode === 'signup' ? 'Min 8 characters' : ''}
              />
            </div>

            {error && (
              <div
                className="text-xs px-3 py-2 rounded-sm"
                style={{
                  background: 'var(--error-bg, rgba(239, 68, 68, 0.1))',
                  color: 'var(--error-text, #ef4444)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full text-sm font-medium rounded-sm px-3 py-2.5 mt-1 transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text, #fff)',
                opacity: isAuthenticating ? 0.7 : 1,
                cursor: isAuthenticating ? 'wait' : 'pointer',
              }}
            >
              {isAuthenticating
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
