import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import CenterMessage from '../components/CenterMessage';
import '../styles/table.css';

export interface RollCall {
  id: string;
  teacher_id: number;
  created_at: number;
  total_students: number;
  checked_in_students: number;
  is_active: boolean;
  expires_at: number;
}

interface RollCallTableProps {
  rollCalls: RollCall[];
}

const TeacherRollCallList = () => {
  const { user, token } = useAuth();
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRollCalls = useCallback(async () => {
    if (!user || !token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/teacher/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
      const data = await response.json();
      setRollCalls(data);
    } catch (err) {
      console.error(err);
      setError('点呼一覧の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchRollCalls();
  }, [fetchRollCalls]);

  // Hook以降で条件分岐

  const { activeRollCalls, endedRollCalls } = useMemo(
    () => ({
      activeRollCalls: rollCalls.filter((rc) => rc.is_active),
      endedRollCalls: rollCalls.filter((rc) => !rc.is_active)
    }),
    [rollCalls]
  );

  if (loading) return <CenterMessage>読込中...</CenterMessage>;
  if (error)
    return (
      <CenterMessage>
        <p className="text-red-500 mb-4">{error}</p>
        <Button text="戻る" arrowLeft link="/teacher/call" />
      </CenterMessage>
    );

  const RollCallTable = ({ rollCalls }: RollCallTableProps) => (
    <div className="overflow-y-auto flex flex-grow max-w-[90dvw] mx-auto rounded-xl">
      <table className="table-base table-rounded table-shadow">
        <thead>
          <tr>
            <th className="p-2 text-left">状態</th>
            <th className="p-2 text-left time-col-inline">開始</th>
            <th className="p-2 text-left time-col-inline">終了</th>
            <th className="p-2 text-left time-col-stacked">時間</th>
            <th className="p-2 text-left">応答状況</th>
            <th className="p-2 text-left">先生</th>
            <th className="p-2 text-left">詳細</th>
          </tr>
        </thead>
        <tbody>
          {rollCalls.map((rc) => {
            const ratio = `${rc.checked_in_students}/${rc.total_students}`;
            const active = rc.is_active;
            const renderDate = (ms: number) => {
              const d = new Date(ms);
              const y = d.getFullYear();
              const m = d.getMonth() + 1;
              const day = d.getDate();
              const hh = d.getHours();
              const mm = d.getMinutes().toString().padStart(2, '0');
              return `${y}年${m}月${day}日 ${hh}時${mm}分`;
            };
            return (
              <tr key={rc.id} className={!active ? 'opacity-70' : ''}>
                <td className="p-2">
                  <span className={`table-badge ${active ? 'table-badge-green' : 'table-badge-gray'} ${!active ? 'table-badge-red' : ''}`}>{active ? '実施' : '終了'}</span>
                </td>
                <td className="p-2 time-col-inline">{renderDate(rc.created_at)}</td>
                <td className="p-2 time-col-inline">{renderDate(rc.expires_at)}</td>
                <td className="p-2 time-col-stacked">
                  <div className="time-range">
                    <span>{renderDate(rc.created_at)}</span>
                    <span>{renderDate(rc.expires_at)}</span>
                  </div>
                </td>
                <td className="p-2">{ratio}</td>
                <td className="p-2">{rc.teacher_id}</td>
                <td className="p-2">
                  <Link to={`/teacher/call-viewer?id=${rc.id}`} className="inline-flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 transition px-2 py-1">
                    <FaArrowRight size={16} className="text-blue-600" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // Second row (end time / teacher) handled via separate table? Simplify by merging info under first row.
  // 以前の2行構成を1行に簡略化しました。
  // 必要なら再導入可能です。
  // (teacher_id と expires_at をツールチップ表示などにする案もあり)

  const LegacyEndedTable = RollCallTable; // 終了テーブルも同じスタイルで統一

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{'点呼一覧'}</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">{'現在発動中の点呼'}</h2>
        {activeRollCalls.length === 0 ? <p>{'現在、発動中の点呼はありません。'}</p> : <RollCallTable rollCalls={activeRollCalls} />}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">{'終了した点呼'}</h2>
        {endedRollCalls.length === 0 ? <p>{'終了した点呼はありません。'}</p> : <LegacyEndedTable rollCalls={endedRollCalls} />}
      </section>

      <div className="flex items-center justify-center m-2">
        <Button text="戻る" arrowLeft link="/teacher/call" />
      </div>
    </div>
  );
};

export default TeacherRollCallList;
