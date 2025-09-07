import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import { appFetch } from '../helpers/apiClient';
import { CacheKeys } from '../helpers/cacheKeys';
import CenterMessage from '../components/CenterMessage';
import '../styles/table.css';
import MDButton from '../components/MDButton';

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

const formatDateTimeJP = (ms: number) => {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  return (
    <div className="leading-tight">
      <div>{`${y}年${m}月${day}日`}</div>
      <div>{`${hh}時${mm}分`}</div>
    </div>
  );
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
      const data = await appFetch<HistoryItem[]>(`${SERVER_ENDPOINT}/api/roll-call/history?student_id=${user.userId}&limit=100`, {
        requiresAuth: true,
        cacheKey: CacheKeys.rollCall.historyForStudent(user.userId),
        alwaysFetch: true
      });
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
        <table className="table-base table-rounded table-shadow">
          <thead>
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
                  <td className="p-2">{formatDateTimeJP(it.created_at)}</td>
                  <td className="p-2">
                    <span className={`table-badge ${label === '応答' ? 'table-badge-green' : label === '不在' ? 'table-badge-yellow' : label === '未応答' ? 'table-badge-red' : 'table-badge-blue'}`}>
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
                  <td className="p-2">{formatDateTimeJP(it.expires_at)}</td>
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
      <h1 className="text-xl font-bold">点呼履歴</h1>
      <div className="flex w-full max-w-2xl justify-between items-center mb-4">
        <MDButton text="戻る" arrowLeft link="/" width="mobiry-button-150" />
        <MDButton text="更新" onClick={fetchHistory} width="mobiry-button-150" />
      </div>
      {content}
    </div>
  );
};

export default RollCallHistory;
