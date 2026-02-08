export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type PlanTier = 'free' | 'pro_trial' | 'pro' | 'subscription';

export interface UserPlan {
  tier: PlanTier;
  features: string[];
  maxCodes: number;
  trialDaysRemaining?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface JwtClaims {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}
