import { useEffect, useRef } from 'react';

/**
 * 簡易ポーリングフック
 * @param fn 実行する async 関数 (内部で例外握りつぶさない)
 * @param intervalMs インターバル(ms)
 * @param deps 依存配列 (オン/オフ制御用)。false を返すガードは fn 内で行う。
 */
export const usePolling = (fn: () => void | Promise<void>, intervalMs: number, deps: unknown[] = []) => {
  const savedFn = useRef(fn);
  const timerRef = useRef<number | null>(null);

  // fn が変わったら更新
  useEffect(() => {
    savedFn.current = fn;
  }, [fn]);

  useEffect(() => {
    // 直ちに1回実行
    savedFn.current();
    timerRef.current = window.setInterval(() => {
      savedFn.current();
    }, intervalMs);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export default usePolling;
