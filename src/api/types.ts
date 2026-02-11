export type FeatureKey =
  | 'basic_qr_types'
  | 'advanced_qr_types'
  | 'advanced_customization'
  | 'svg_export'
  | 'pdf_export'
  | 'eps_export'
  | 'batch_generation'
  | 'templates'
  | 'unlimited_history'
  | 'web_asset_pack'
  | 'dynamic_codes'
  | 'analytics';

export const FREE_FEATURES: FeatureKey[] = [
  'basic_qr_types',
  'advanced_qr_types',
  'advanced_customization',
  'svg_export',
  'pdf_export',
  'eps_export',
  'batch_generation',
  'templates',
  'unlimited_history',
  'web_asset_pack',
];

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type PlanTier = 'free' | 'subscription';

export interface UserPlan {
  tier: PlanTier;
  features: string[];
  maxCodes: number;
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
