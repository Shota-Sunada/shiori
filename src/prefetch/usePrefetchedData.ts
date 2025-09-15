import { useEffect, useRef, useState, useCallback } from 'react';
import { consumePrefetchData } from './cache';
import type { PrefetchKey } from './cache';

// ページコンポーネント冒頭で利用し、既にプレフェッチ済みなら即座に値を返す
// 無ければ fetcher() を実行
export function usePrefetchedData<T>(key: PrefetchKey, fetcher: () => Promise<T>) {
  const consumedRef = useRef(false);
  const [data, setData] = useState<T | undefined>(() => {
    const d = consumePrefetchData<T>(key);
    if (d !== undefined) {
      consumedRef.current = true;
    }
    return d;
  });
  const [loading, setLoading] = useState(!consumedRef.current);
  const [error, setError] = useState<unknown>(null);

  const runFetch = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    fetcher()
      .then((r) => {
        if (!cancelled) setData(r);
      })
      .catch((e) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  useEffect(() => {
    if (consumedRef.current) return;
    const cleanup = runFetch();
    return cleanup;
  }, [runFetch, fetcher]);

  const refresh = useCallback(() => {
    runFetch();
  }, [runFetch]);

  return { data, loading, error, refresh };
}
