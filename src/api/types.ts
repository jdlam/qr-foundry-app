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

// Worker API types

export type CodeStatus = 'active' | 'paused' | 'expired';

export interface DynamicQRRecord {
  shortCode: string;
  destinationUrl: string;
  createdAt: string;
  updatedAt: string;
  status: CodeStatus;
  expiresAt?: string;
  password?: string;
  label?: string;
  ownerId: string;
}

export interface CreateCodeRequest {
  destinationUrl: string;
  label?: string;
  expiresAt?: string;
  password?: string;
  customCode?: string;
}

export interface UpdateCodeRequest {
  destinationUrl?: string;
  status?: Exclude<CodeStatus, 'expired'>;
  label?: string | null;
  expiresAt?: string | null;
  password?: string | null;
}

export interface UsageResponse {
  ownerId: string;
  limit: number;
  total: number;
  active: number;
  paused: number;
  expired: number;
  remaining: number;
}

export type Granularity = 'hour' | 'day' | 'week';

export interface AnalyticsParams {
  start?: string;
  end?: string;
  granularity?: Granularity;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface RankedItem {
  name: string;
  count: number;
}

export interface ScanAnalyticsResponse {
  shortCode: string;
  period: { start: string; end: string };
  totalScans: number;
  scansOverTime: TimeSeriesPoint[];
  topCountries: RankedItem[];
  topCities: RankedItem[];
  topReferers: RankedItem[];
}

export interface ScanAnalyticsSummary {
  period: { start: string; end: string };
  totalScans: number;
  scansOverTime: TimeSeriesPoint[];
  topCodes: (RankedItem & { label?: string })[];
  topCountries: RankedItem[];
}
