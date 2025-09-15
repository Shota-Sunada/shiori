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
  ttlMs?: number; // 有効期間 (指定時のみ判定)
  staleWhileRevalidate?: boolean; // 期限切れ時: キャッシュを即返し裏で更新
}

const responseCache: Record<string, { data: unknown; at: number }> = {};

export const DEFAULT_TTL_MS = 1000 * 60 * 60 * 3; // 明示未指定の場合は3時間

export async function appFetch<T = unknown>(url: string, opts: AppFetchOptions = {}): Promise<T> {
  const { requiresAuth, jsonBody, cacheKey, alwaysFetch, ttlMs = DEFAULT_TTL_MS, staleWhileRevalidate, ...rest } = opts;
  if (cacheKey && !alwaysFetch && responseCache[cacheKey]) {
    const entry = responseCache[cacheKey];
    const age = Date.now() - entry.at;
    const expired = ttlMs > 0 && age > ttlMs;
    if (!expired) {
      // 新鮮 or TTL無し
      return entry.data as T;
    }
    if (expired && staleWhileRevalidate) {
      // 期限切れだが即時返却 + 裏で更新
      // Fire & forget refresh
      (async () => {
        try {
          const fresh = await apiRequest<T>(url, {
            ...rest,
            method: rest.method || (jsonBody ? 'POST' : 'GET'),
            requiresAuth,
            authToken: getAuthToken() || undefined,
            json: jsonBody
          });
          responseCache[cacheKey] = { data: fresh, at: Date.now() };
        } catch {
          /* 静かに失敗 */
        }
      })();
      return entry.data as T;
    }
    // expired & no staleWhileRevalidate -> fallthrough to network fetch
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

// 指定 prefix に一致するキャッシュを削除
export function clearAppFetchCacheByPrefix(prefix: string) {
  Object.keys(responseCache)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => delete responseCache[k]);
}

// Mutation 用ヘルパ (API 呼び出し + キャッシュ無効化)
interface MutateOptions<TResp> {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  jsonBody?: unknown;
  requiresAuth?: boolean;
  // 完全一致で無効化するキャッシュキー
  invalidateKeys?: string[];
  // prefix で無効化するキャッシュキー
  invalidatePrefixes?: string[];
  // レスポンス変換 (任意)
  mapResponse?: (data: TResp) => TResp;
  // 楽観的更新: キャッシュを事前に書き換える (失敗時ロールバック)
  optimistic?: Array<{
    key: string;
    apply: (current: unknown) => unknown;
  }>;
  rollbackOnError?: boolean;
}

export async function mutate<TResp = unknown>(opts: MutateOptions<TResp>): Promise<TResp> {
  const { url, method, jsonBody, requiresAuth = true, invalidateKeys = [], invalidatePrefixes = [], mapResponse, optimistic, rollbackOnError = true } = opts;
  const optimisticSnapshots: Record<string, { data: unknown; at: number }> = {};
  const optimisticKeys = new Set<string>(optimistic?.map((o) => o.key) || []);
  // Apply optimistic updates
  if (optimistic) {
    for (const o of optimistic) {
      if (responseCache[o.key]) {
        optimisticSnapshots[o.key] = { ...responseCache[o.key] };
        try {
          const next = o.apply(responseCache[o.key].data);
          responseCache[o.key] = { data: next, at: Date.now() };
        } catch {
          // ignore faulty optimistic transformation
        }
      }
    }
  }
  try {
    const data = await appFetch<TResp>(url, { method, jsonBody, requiresAuth, alwaysFetch: true });
    // Invalidation (avoid wiping keys we just optimistically updated unless明示的に指定されたが ここでは除外)
    invalidateKeys.filter((k) => !optimisticKeys.has(k)).forEach((k) => clearAppFetchCache(k));
    invalidatePrefixes.forEach((p) => clearAppFetchCacheByPrefix(p));
    return mapResponse ? mapResponse(data) : data;
  } catch (e) {
    if (rollbackOnError && optimistic) {
      // rollback
      for (const key of Object.keys(optimisticSnapshots)) {
        responseCache[key] = optimisticSnapshots[key];
      }
    }
    throw e;
  }
}
