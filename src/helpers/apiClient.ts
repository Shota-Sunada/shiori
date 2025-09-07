import { getAuthToken } from './authTokenStore';

// 基本的なAPI呼び出しユーティリティ（自動でJSON, 認証, エラーハンドリング）
export interface BaseRequestOptions extends RequestInit {
  authToken?: string | null; // 明示的に渡したい場合
  requiresAuth?: boolean;
  json?: unknown; // bodyとしてJSON送信
  parse?: 'json' | 'text' | 'none';
  okIf?: (res: Response) => boolean; // 特定ステータス許可
}

export async function apiRequest<T = unknown>(url: string, opts: BaseRequestOptions = {}): Promise<T> {
  const { authToken, requiresAuth, json, parse = 'json', okIf, headers, ...rest } = opts;
  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>), Accept: 'application/json' };
  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json';
  }
  if (requiresAuth && authToken) {
    finalHeaders['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await fetch(url, { ...rest, headers: finalHeaders, body: json !== undefined ? JSON.stringify(json) : rest.body });
  if (!res.ok && !(okIf && okIf(res))) {
    const text = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status} ${res.statusText} ${text}`);
  }
  if (parse === 'none') return undefined as unknown as T;
  if (parse === 'text') return (await res.text()) as unknown as T;
  return (await res.json()) as T;
}

export const apiGet = <T = unknown>(url: string, opts: BaseRequestOptions = {}) => apiRequest<T>(url, { ...opts, method: 'GET' });
export const apiPost = <T = unknown>(url: string, json?: unknown, opts: BaseRequestOptions = {}) => apiRequest<T>(url, { ...opts, method: 'POST', json });
export const apiPut = <T = unknown>(url: string, json?: unknown, opts: BaseRequestOptions = {}) => apiRequest<T>(url, { ...opts, method: 'PUT', json });
export const apiPatch = <T = unknown>(url: string, json?: unknown, opts: BaseRequestOptions = {}) => apiRequest<T>(url, { ...opts, method: 'PATCH', json });
export const apiDelete = <T = unknown>(url: string, opts: BaseRequestOptions = {}) => apiRequest<T>(url, { ...opts, method: 'DELETE' });

// 呼び出し側が fetch ライクに使えるラッパ (認証要否 / JSON送信 / キャッシュキー指定)
interface AppFetchOptions extends Omit<BaseRequestOptions, 'authToken' | 'json'> {
  requiresAuth?: boolean;
  jsonBody?: unknown; // JSON送信したい場合
  cacheKey?: string; // 指定でキャッシュ利用
  alwaysFetch?: boolean; // キャッシュを無視
}

const responseCache: Record<string, { data: unknown; at: number }> = {};

export async function appFetch<T = unknown>(url: string, opts: AppFetchOptions = {}): Promise<T> {
  const { requiresAuth, jsonBody, cacheKey, alwaysFetch, ...rest } = opts;
  if (cacheKey && !alwaysFetch && responseCache[cacheKey]) {
    return responseCache[cacheKey].data as T;
  }
  const token = getAuthToken();
  const data = await apiRequest<T>(url, {
    ...rest,
    method: rest.method || (jsonBody ? 'POST' : 'GET'),
    requiresAuth,
    authToken: token || undefined,
    json: jsonBody
  });
  if (cacheKey) {
    responseCache[cacheKey] = { data, at: Date.now() };
  }
  return data;
}

export function clearAppFetchCache(key?: string) {
  if (key) delete responseCache[key];
  else Object.keys(responseCache).forEach((k) => delete responseCache[k]);
}
