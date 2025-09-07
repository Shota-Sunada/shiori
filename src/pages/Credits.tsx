import { useState, useEffect, useCallback } from 'react';
import Button from '../components/Button';
import { SERVER_ENDPOINT } from '../App';
import { useAuth } from '../auth-context';
import CenterMessage from '../components/CenterMessage';

interface Credit {
  category: string;
  items: string;
}

const Credits = () => {
  const { token } = useAuth();
  const [credits, setCredits] = useState<Credit[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!token) return;
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/credits`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTPエラー status: ${response.status}`);
      const data: Credit[] = await response.json();
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
        <Button text="再試行" onClick={fetchCredits} />
      </CenterMessage>
    );
  if (!credits || credits.length === 0)
    return (
      <CenterMessage>
        <p>{'クレジット情報がありません。'}</p>
        <Button text="ホームに戻る" arrowLeft link="/index" />
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
      <Button text="ホームに戻る" arrowLeft link="/index" />
    </div>
  );
};

export default Credits;
