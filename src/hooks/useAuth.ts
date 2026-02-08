import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const plan = useAuthStore((s) => s.plan);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticating = useAuthStore((s) => s.isAuthenticating);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const logout = useAuthStore((s) => s.logout);

  return { user, plan, isLoading, isAuthenticating, isLoggedIn, login, signup, logout };
}
