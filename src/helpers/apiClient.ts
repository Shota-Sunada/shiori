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

// localStorageキーのprefix
const LS_PREFIX = 'appFetchCache_';

// ttlMsも含めて返す
function loadCacheFromLocalStorage<T = unknown>(key: string): { data: T; at: number; ttlMs?: number } | undefined {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ttlMsも保存
function saveCacheToLocalStorage<T = unknown>(key: string, value: { data: T; at: number; ttlMs?: number }) {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
  } catch {
    // quota超過やprivate mode等は無視
  }
}

function removeCacheFromLocalStorage(key: string) {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    //
  }
}

function removeCacheByPrefixFromLocalStorage(prefix: string) {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX + prefix)) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    //
  }
}

export const DEFAULT_TTL_MS = 1000 * 60 * 60 * 3; // 明示未指定の場合は3時間

export async function appFetch<T = unknown>(url: string, opts: AppFetchOptions = {}): Promise<T> {
  const { requiresAuth, jsonBody, cacheKey, alwaysFetch, ttlMs = DEFAULT_TTL_MS, staleWhileRevalidate, ...rest } = opts;
  let entry: { data: unknown; at: number; ttlMs?: number } | undefined;
  if (cacheKey && !alwaysFetch) {
    entry = loadCacheFromLocalStorage<T>(cacheKey);
    if (entry) {
      const age = Date.now() - entry.at;
      const expired = ttlMs > 0 && age > ttlMs;
      if (!expired) {
        let remainStr = '無期限';
        if (ttlMs > 0) {
          const remainMs = Math.max(ttlMs - age, 0);
          const h = Math.floor(remainMs / (1000 * 60 * 60));
          const m = Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((remainMs % (1000 * 60)) / 1000);
          remainStr = `${h}時間${m}分${s}秒`;
        }
        console.log(`====================================\n[AppFetch] ｷｬｯｼｭ読み込み key「${cacheKey}」\n[AppFetch] (有効期限: ${remainStr})\n====================================`);
        return entry.data as T;
      }
      if (expired && staleWhileRevalidate) {
        (async () => {
          try {
            const fresh = await apiRequest<T>(url, {
              ...rest,
              method: rest.method || (jsonBody ? 'POST' : 'GET'),
              requiresAuth,
              authToken: getAuthToken() || undefined,
              json: jsonBody
            });
            const newEntry = { data: fresh, at: Date.now(), ttlMs };
            saveCacheToLocalStorage(cacheKey!, newEntry);
            let ttlStr = '無期限';
            if (ttlMs > 0) {
              const h = Math.floor(ttlMs / (1000 * 60 * 60));
              const m = Math.floor((ttlMs % (1000 * 60 * 60)) / (1000 * 60));
              const s = Math.floor((ttlMs % (1000 * 60)) / 1000);
              ttlStr = `${h}時間${m}分${s}秒`;
            }
            console.log(`====================================\n[AppFetch] ｷｬｯｼｭを作成・更新 key「${cacheKey}」\n[AppFetch] (有効期限: ${ttlStr})\n====================================`);
          } catch {
            /* 静かに失敗 */
          }
        })();
        return entry.data as T;
      }
      // expired & no staleWhileRevalidate -> fallthrough to network fetch
    }
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
    const newEntry = { data, at: Date.now(), ttlMs };
    saveCacheToLocalStorage(cacheKey, newEntry);
    let ttlStr = '無期限';
    if (ttlMs > 0) {
      const h = Math.floor(ttlMs / (1000 * 60 * 60));
      const m = Math.floor((ttlMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((ttlMs % (1000 * 60)) / 1000);
      ttlStr = `${h}時間${m}分${s}秒`;
    }
    console.log(`====================================\n[AppFetch] ｷｬｯｼｭを作成・更新 key「${cacheKey}」\n[AppFetch] (有効期限: ${ttlStr})\n====================================`);
  }
  return data;
}

export function clearAppFetchCache(key?: string) {
  if (key) {
    removeCacheFromLocalStorage(key);
  } else {
    removeCacheByPrefixFromLocalStorage('');
  }
}

// 指定 prefix に一致するキャッシュを削除
export function clearAppFetchCacheByPrefix(prefix: string) {
  removeCacheByPrefixFromLocalStorage(prefix);
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
  const optimisticSnapshots: Record<string, { data: unknown; at: number; ttlMs?: number }> = {};
  const optimisticKeys = new Set<string>(optimistic?.map((o) => o.key) || []);
  // Apply optimistic updates (localStorageのみ)
  if (optimistic) {
    for (const o of optimistic) {
      const entry = loadCacheFromLocalStorage(o.key);
      if (entry) {
        optimisticSnapshots[o.key] = { ...entry };
        try {
          const next = o.apply(entry.data);
          saveCacheToLocalStorage(o.key, { data: next, at: Date.now(), ttlMs: entry.ttlMs });
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
      // rollback (localStorageのみ)
      for (const key of Object.keys(optimisticSnapshots)) {
        saveCacheToLocalStorage(key, optimisticSnapshots[key]);
      }
    }
    throw e;
  }
}
