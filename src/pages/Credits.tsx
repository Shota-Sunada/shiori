import { useState, useEffect, useCallback } from 'react';
import MDButton, { BackToHome } from '../components/MDButton';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { useAuth } from '../auth-context';
import CenterMessage from '../components/CenterMessage';
import { appFetch } from '../helpers/apiClient';

interface Credit {
  category: string;
  items: string;
}

const Credits = () => {
  const { user,token } = useAuth();
  const [credits, setCredits] = useState<Credit[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const data = await appFetch<Credit[]>(`${SERVER_ENDPOINT}/api/credits`, { requiresAuth: true });
      setCredits(data);
      setStatus('success');
    } catch (e) {
      setError((e as Error).message || '不明なエラー');
      setStatus('error');
    }
  }, [token]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  if (status === 'loading') return <CenterMessage>読み込み中...</CenterMessage>;
  if (status === 'error')
    return (
      <CenterMessage>
        <p className="text-red-500">エラー: {error}</p>
        <MDButton text="再試行" onClick={fetchCredits} />
      </CenterMessage>
    );
  if (!credits || credits.length === 0)
    return (
      <CenterMessage>
        <p>{'クレジット情報がありません。'}</p>
        <BackToHome user={user} />
      </CenterMessage>
    );

  return (
    <div className="flex flex-col items-center justify-center m-[10px] text-center">
      <h1 className="text-xl font-bold mb-2">{'クレジット'}</h1>
      <div className="flex flex-col items-center">
        {credits.map(({ category, items }, idx) => (
          <div key={idx} className="m-2">
            <p className="font-bold">{category}</p>
            {items.split(',').map((item, i) => (
              <p key={i}>{item.trim()}</p>
            ))}
          </div>
        ))}
      </div>
      <BackToHome user={user} />
    </div>
  );
};

export default Credits;
