import type {
  ApiResponse,
  DynamicQRRecord,
  CreateCodeRequest,
  UpdateCodeRequest,
  CodeStatus,
  UsageResponse,
  AnalyticsParams,
  ScanAnalyticsResponse,
  ScanAnalyticsSummary,
} from './types';

const WORKER_BASE = import.meta.env.VITE_WORKER_URL || 'https://qrfo.link';

export class WorkerApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'WorkerApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${WORKER_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    throw new WorkerApiError(body.error || `Request failed with status ${res.status}`, res.status);
  }

  return body.data as T;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const workerApi = {
  async createCode(token: string, body: CreateCodeRequest): Promise<DynamicQRRecord> {
    return request<DynamicQRRecord>('/api/codes', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
  },

  async listCodes(token: string, status?: CodeStatus): Promise<DynamicQRRecord[]> {
    const params = status ? `?status=${status}` : '';
    return request<DynamicQRRecord[]>(`/api/codes${params}`, {
      headers: authHeaders(token),
    });
  },

  async getCode(token: string, shortCode: string): Promise<DynamicQRRecord> {
    return request<DynamicQRRecord>(`/api/codes/${encodeURIComponent(shortCode)}`, {
      headers: authHeaders(token),
    });
  },

  async updateCode(token: string, shortCode: string, body: UpdateCodeRequest): Promise<DynamicQRRecord> {
    return request<DynamicQRRecord>(`/api/codes/${encodeURIComponent(shortCode)}`, {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify(body),
    });
  },

  async deleteCode(token: string, shortCode: string): Promise<{ deleted: string }> {
    return request<{ deleted: string }>(`/api/codes/${encodeURIComponent(shortCode)}`, {
      method: 'DELETE',
      headers: authHeaders(token),
    });
  },

  async getUsage(token: string): Promise<UsageResponse> {
    return request<UsageResponse>('/api/usage', {
      headers: authHeaders(token),
    });
  },

  async getCodeAnalytics(token: string, shortCode: string, params?: AnalyticsParams): Promise<ScanAnalyticsResponse> {
    const query = buildAnalyticsQuery(params);
    return request<ScanAnalyticsResponse>(`/api/analytics/${encodeURIComponent(shortCode)}${query}`, {
      headers: authHeaders(token),
    });
  },

  async getAnalyticsOverview(token: string, params?: AnalyticsParams): Promise<ScanAnalyticsSummary> {
    const query = buildAnalyticsQuery(params);
    return request<ScanAnalyticsSummary>(`/api/analytics${query}`, {
      headers: authHeaders(token),
    });
  },
};

function buildAnalyticsQuery(params?: AnalyticsParams): string {
  if (!params) return '';
  const parts: string[] = [];
  if (params.start) parts.push(`start=${encodeURIComponent(params.start)}`);
  if (params.end) parts.push(`end=${encodeURIComponent(params.end)}`);
  if (params.granularity) parts.push(`granularity=${params.granularity}`);
  return parts.length ? `?${parts.join('&')}` : '';
}
