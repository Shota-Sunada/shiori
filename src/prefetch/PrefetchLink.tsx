import React, { useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { setPrefetchData, hasPrefetchData } from './cache';
import type { PrefetchKey } from './cache';

type Fetcher = () => Promise<unknown>;

interface Props extends LinkProps {
  prefetchKey: PrefetchKey;
  fetcher: Fetcher;
  // ユーザーがクリックした時点で未完了なら一旦待つ(デフォルトtrue)
  awaitOnClick?: boolean;
}

export const PrefetchLink: React.FC<Props> = ({ prefetchKey, fetcher, awaitOnClick = true, onClick, onMouseEnter, ...rest }) => {
  const startedRef = useRef(false);
  const promiseRef = useRef<Promise<unknown> | null>(null);

  const trigger = useCallback(() => {
    if (startedRef.current || hasPrefetchData(prefetchKey)) return;
    startedRef.current = true;
    const p = fetcher()
      .then((data) => {
        setPrefetchData(prefetchKey, data);
        return data;
      })
      .catch((e) => {
        // 失敗しても遷移自体は許可; 再取得はページ側
        console.warn('Prefetch failed', prefetchKey, e);
      });
    promiseRef.current = p;
  }, [prefetchKey, fetcher]);

  const handleMouseEnter: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    trigger();
    onMouseEnter?.(e);
  };

  const handleClick: React.MouseEventHandler<HTMLAnchorElement> = async (e) => {
    if (awaitOnClick && promiseRef.current) {
      try {
        await promiseRef.current;
      } catch {
        // ignore
      }
    }
    onClick?.(e);
  };

  return <Link {...rest} onMouseEnter={handleMouseEnter} onClick={handleClick} />;
};
