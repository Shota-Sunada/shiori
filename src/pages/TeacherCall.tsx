import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';
import { useAuth } from '../auth-context';

interface Student {
  gakuseki: number;
  surname: string;
  forename: string;
  class: number;
  number: number;
  status: 'targeted' | 'checked_in';
}

interface RollCall {
  teacher_id: number;
  created_at: string;
  is_active: boolean;
}

const TeacherCall = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const rollCallId = searchParams.get('id');
  const navigate = useNavigate();

  const [rollCall, setRollCall] = useState<RollCall | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!rollCallId || !token) return;
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call?id=${rollCallId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        const data = await response.json();
        setRollCall(data.rollCall);
        setStudents(data.students);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [rollCallId, token]);

  const onEndSession = async () => {
    if (!rollCallId || !token) return;

    if (!window.confirm('本当に点呼を終了しますか？')) return;

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roll_call_id: rollCallId })
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }

      alert('点呼を終了しました。');
      navigate('/teacher/roll-call-list');
    } catch (error) {
      console.error('点呼の終了に失敗しました:', error);
      alert('点呼の終了に失敗しました。');
    }
  };

  const endButton = () => (
    <div className="text-center m-3">
      <button
        onClick={onEndSession}
        disabled={!rollCall?.is_active}
        className="p-2 px-6 text-white bg-red-500 rounded hover:bg-red-700 focus:outline-none focus:shadow-outline cursor-pointer disabled:bg-gray-400">
        {rollCall?.is_active ? '点呼終了' : '点呼は終了しています'}
      </button>
    </div>
  );

  if (loading) {
    return <p className="text-center mt-8">{'読み込み中...'}</p>;
  }

  if (error) {
    return <p className="text-center mt-8 text-red-500">エラー: {error}</p>;
  }

  const checkedInCount = students.filter((s) => s.status === 'checked_in').length;
  const totalStudents = students.length;

  return (
    <div className="flex flex-col items-center justify-center m-4">
      <div className="w-full max-w-4xl p-4 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">{'点呼実施中'}</h1>
        <p className="text-lg text-center mb-2">
          {'点呼ID: '}
          {rollCallId}
        </p>
        <p className="text-lg text-center mb-2">
          {'開始した先生: '}
          {rollCall?.teacher_id}
        </p>
        <p className="text-lg text-center mb-4">
          {'応答状況: '}
          {checkedInCount}
          {' / '}
          {totalStudents}
        </p>

        {students.length > 20 ? endButton() : <></>}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-4 border-b">{'クラス'}</th>
                <th className="py-2 px-4 border-b">{'番号'}</th>
                <th className="py-2 px-4 border-b">{'氏名'}</th>
                <th className="py-2 px-4 border-b">{'状態'}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.gakuseki} className="text-center">
                  <td className="py-2 px-4 border-b">{student.class}</td>
                  <td className="py-2 px-4 border-b">{student.number}</td>
                  <td className="py-2 px-4 border-b">{`${student.surname} ${student.forename}`}</td>
                  <td className="py-2 px-4 border-b">
                    {student.status === 'checked_in' ? (
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">{'応答済み'}</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">{'未応答'}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {endButton()}
      </div>

      <Button text="点呼一覧へ戻る" arrow onClick={() => navigate('/teacher/roll-call-list')} />
    </div>
  );
};

export default TeacherCall;
