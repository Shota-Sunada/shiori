import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { setPrefetchData } from './cache';
import type { PrefetchKey } from './cache';

interface NavigatePrefetchOptions<T> {
  to: string;
  key: PrefetchKey;
  fetcher: () => Promise<T>;
  awaitFetch?: boolean; // デフォルト: true (完了を待ってから遷移)
}

// useNavigate を使ったプログラム的遷移にもプレフェッチを適用するためのフック
export function usePrefetchNavigate() {
  const navigate = useNavigate();

  const navigateWithPrefetch = useCallback(
    async <T>({ to, key, fetcher, awaitFetch = true }: NavigatePrefetchOptions<T>) => {
      if (awaitFetch) {
        try {
          const data = await fetcher();
          setPrefetchData(key, data);
        } catch (e) {
          // 失敗しても遷移は継続
          console.warn('prefetch failed (await mode)', key, e);
        }
        navigate(to);
      } else {
        fetcher()
          .then((data) => setPrefetchData(key, data))
          .catch((e) => console.warn('prefetch failed (fire & forget)', key, e));
        navigate(to);
      }
    },
    [navigate]
  );

  return { navigateWithPrefetch };
}
