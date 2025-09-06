import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import RollCallTable, { type RollCall } from '../components/RollCallTable';
import Button from '../components/Button';

const TeacherRollCallList = () => {
  const { user, token } = useAuth();
  const [rollCalls, setRollCalls] = useState<RollCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const fetchRollCalls = async () => {
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/teacher/${user.userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        const data = await response.json();
        setRollCalls(data);
      } catch (err) {
        setError('点呼一覧の取得に失敗しました。');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRollCalls();
  }, [user, token]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">{'読込中...'}</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  const activeRollCalls = rollCalls.filter((rc) => rc.is_active);
  const endedRollCalls = rollCalls.filter((rc) => !rc.is_active);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{'点呼一覧'}</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">{'現在発動中の点呼'}</h2>
        {activeRollCalls.length === 0 ? <p>{'現在、発動中の点呼はありません。'}</p> : <RollCallTable rollCalls={activeRollCalls} />}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold mb-2">{'終了した点呼'}</h2>
        {endedRollCalls.length === 0 ? <p>{'終了した点呼はありません。'}</p> : <RollCallTable rollCalls={endedRollCalls} />}
      </section>

      <div className="flex items-center justify-center m-2">
        <Button text="戻る" arrowRight link="/teacher" />
      </div>
    </div>
  );
};

export default TeacherRollCallList;
