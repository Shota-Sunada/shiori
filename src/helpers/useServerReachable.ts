import { useEffect, useState } from 'react';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';

export function useServerReachable(): boolean | null {
  const [reachable, setReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    // HEADリクエストでサーバー疎通確認
    fetch(SERVER_ENDPOINT, { method: 'HEAD', mode: 'no-cors' })
      .then(() => {
        if (!cancelled) setReachable(true);
      })
      .catch(() => {
        if (!cancelled) setReachable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return reachable;
}
