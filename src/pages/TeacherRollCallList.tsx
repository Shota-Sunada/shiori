import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import CenterMessage from '../components/CenterMessage';

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

  const RollCallTable = ({ rollCalls }: RollCallTableProps) => {
    return (
      <div className="overflow-y-auto flex flex-grow max-w-[90dvw] mx-auto rounded-xl">
        <table className="w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 border-b align-middle" rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }}>
                {'状態'}
              </th>
              <th className="py-2 px-0.5 border-b">{'開始日時'}</th>
              <th className="py-2 px-0.5 border-b">{'応答状況'}</th>
              <th className="py-2 px-0.5 border-b" rowSpan={2}>
                {'詳細'}
              </th>
            </tr>
            <tr>
              <th className="py-2 px-0.5 border-b">{'終了日時'}</th>
              <th className="py-2 px-0.5 border-b">{'先生'}</th>
            </tr>
          </thead>
          <tbody>
            {rollCalls.map((rollCall) => (
              <tr key={rollCall.id} className={`${!rollCall.is_active ? 'bg-gray-200' : ''}`}>
                <td className="py-1 px-0.5 border-b text-center min-w-4 align-middle" rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }}>
                  {rollCall.is_active ? <span className="bg-green-500 text-white py-1 px-1 rounded">{'実施'}</span> : <span className="bg-gray-500 text-white py-1 px-1 rounded">{'終了'}</span>}
                </td>
                <td className="py-1 px-0.5 border-b text-center">{rollCall.created_at ? new Date(rollCall.created_at).toLocaleString() : '-'}</td>
                <td className="py-1 px-0.5 border-b text-center min-w-12">
                  {rollCall.checked_in_students}
                  {'/'}
                  {rollCall.total_students}
                </td>
                <td className="py-1 px-0.5 border-b text-center" rowSpan={2}>
                  <div className="flex items-center justify-center">
                    <Link to={`/teacher/call-viewer?id=${rollCall.id}`}>
                      <FaArrowRight className="cursor-pointer bg-[#219ace30] rounded-2xl p-1.5" size={'30px'} color="#219bce" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Second row (end time / teacher) handled via separate table? Simplify by merging info under first row.
  // 以前の2行構成を1行に簡略化しました。
  // 必要なら再導入可能です。
  // (teacher_id と expires_at をツールチップ表示などにする案もあり)

  const LegacyEndedTable = ({ rollCalls }: RollCallTableProps) => {
    return (
      <div className="overflow-y-auto flex flex-grow max-w-[90dvw] mx-auto rounded-xl">
        <table className="w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 border-b align-middle" style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }}>
                {'状態'}
              </th>
              <th className="py-2 px-0.5 border-b">{'開始日時'}</th>
              <th className="py-2 px-0.5 border-b">{'終了日時'}</th>
              <th className="py-2 px-0.5 border-b">{'応答状況'}</th>
              <th className="py-2 px-0.5 border-b">{'先生'}</th>
              <th className="py-2 px-0.5 border-b">{'詳細'}</th>
            </tr>
          </thead>
          <tbody>
            {rollCalls.map((rollCall) => (
              <tr key={rollCall.id} className={`${!rollCall.is_active ? 'bg-gray-200' : ''}`}>
                <td className="py-1 px-0.5 border-b text-center min-w-4 align-middle" rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }}>
                  {rollCall.is_active ? <span className="bg-green-500 text-white py-1 px-1 rounded">{'実施'}</span> : <span className="bg-gray-500 text-white py-1 px-1 rounded">{'終了'}</span>}
                </td>
                <td className="py-1 px-0.5 border-b text-center">{rollCall.created_at ? new Date(rollCall.created_at).toLocaleString() : '-'}</td>
                <td className="py-1 px-0.5 border-b text-center">{rollCall.expires_at ? new Date(rollCall.expires_at).toLocaleString() : '-'}</td>
                <td className="py-1 px-0.5 border-b text-center min-w-12">
                  {rollCall.checked_in_students}/{rollCall.total_students}
                </td>
                <td className="py-1 px-0.5 border-b text-center">{rollCall.teacher_id}</td>
                <td className="py-1 px-0.5 border-b text-center">
                  <div className="flex items-center justify-center">
                    <Link to={`/teacher/call-viewer?id=${rollCall.id}`}>
                      <FaArrowRight className="cursor-pointer bg-[#219ace30] rounded-2xl p-1.5" size={'30px'} color="#219bce" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

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
