import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import CenterMessage from '../components/CenterMessage';
import Button from '../components/Button';

interface HistoryItem {
  id: string;
  teacher_id: number;
  created_at: number;
  expires_at: number;
  is_active: 0 | 1 | boolean;
  status: 'pending' | 'checked_in' | null;
  absence_reason?: string | null;
  location?: string | null;
}

const formatTime = (ms: number) => {
  const d = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const statusLabel = (item: HistoryItem) => {
  if (item.status === 'checked_in') return '応答';
  if (item.absence_reason) return '不在';
  // status は 'pending' もしくは null の場合ここに到達
  if (!item.is_active) return '未応答';
  return '進行中';
};

const RollCallHistory = () => {
  const { user, token } = useAuth();
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!user || user.is_teacher || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_ENDPOINT}/api/roll-call/history?student_id=${user.userId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError((e as Error).message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const content = useMemo(() => {
    if (loading) return <CenterMessage>読込中...</CenterMessage>;
    if (error) return <CenterMessage>取得失敗: {error}</CenterMessage>;
    if (!items || items.length === 0) return <CenterMessage>履歴がありません。</CenterMessage>;

    return (
      <div className="w-full max-w-2xl mx-auto p-4">
        <table className="w-full text-sm bg-white shadow rounded overflow-hidden">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 text-left">開始</th>
              <th className="p-2 text-left">状態</th>
              <th className="p-2 text-left">詳細</th>
              <th className="p-2 text-left">期限</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const label = statusLabel(it);
              return (
                <tr key={it.id} className="border-b last:border-none hover:bg-gray-50">
                  <td className="p-2 whitespace-nowrap">{formatTime(it.created_at)}</td>
                  <td className="p-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        label === '応答'
                          ? 'bg-green-100 text-green-700'
                          : label === '不在'
                            ? 'bg-yellow-100 text-yellow-700'
                            : label === '未応答'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-blue-100 text-blue-600'
                      }`}>
                      {label}
                    </span>
                  </td>
                  <td className="p-2 text-xs leading-snug">
                    {it.absence_reason ? (
                      <div>
                        <p className="font-medium">理由: {it.absence_reason}</p>
                        {it.location ? <p className="text-gray-600">場所: {it.location}</p> : null}
                      </div>
                    ) : label === '応答' ? (
                      <p className="text-gray-600">応答済み</p>
                    ) : label === '未応答' ? (
                      <p className="text-gray-500">応答がありませんでした</p>
                    ) : (
                      <p className="text-gray-500">進行中...</p>
                    )}
                  </td>
                  <td className="p-2 whitespace-nowrap">{formatTime(it.expires_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [items, loading, error]);

  if (!user) return <CenterMessage>認証が必要です。</CenterMessage>;
  if (user.is_teacher) return <CenterMessage>生徒専用ページです。</CenterMessage>;

  return (
    <div className="flex flex-col items-center m-4">
      <div className="flex w-full max-w-2xl justify-between items-center mb-4">
        <Button text="戻る" arrowLeft link="/" />
        <h1 className="text-xl font-bold">点呼履歴</h1>
        <Button text="更新" onClick={fetchHistory} />
      </div>
      {content}
    </div>
  );
};

export default RollCallHistory;
