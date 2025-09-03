import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';

interface StudentStatus {
  gakuseki: string;
  surname: string;
  forename: string;
  class: string;
  number: number;
  status: 'pending' | 'checked_in';
}

const Call = () => {
  const [isDone, setIsDone] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const rollCallId = searchParams.get('id');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRollCallStatus = async () => {
      if (!rollCallId || !user) return;

      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call?id=${rollCallId}`);
        if (!response.ok) {
          throw new Error('点呼データの取得に失敗しました。');
        }
        const data = await response.json();
        const currentUserStatus = data.students.find(
          (student: StudentStatus) => student.gakuseki === user.userId
        );

        if (currentUserStatus && currentUserStatus.status === 'checked_in') {
          setIsDone(true);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchRollCallStatus();
  }, [rollCallId, user]);

  const handleCheckIn = async () => {
    if (!user || !rollCallId) {
      alert('エラーが発生しました。');
      return;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roll_call_id: rollCallId, student_id: user.userId })
      });

      const data = await response.json();

      if (response.ok) {
        setIsDone(true);
        // alert(data.message);
      } else {
        throw new Error(data.message || '不明なエラー');
      }
    } catch (error) {
      console.error('点呼への応答中にエラーが発生しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl text-red-500">{error}</p>
        <Button text="戻る" arrow onClick={() => navigate('/index')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-5">
      <p className="text-xl m-3">{'点呼です！'}</p>
      {isDone ? (
        <div className="bg-green-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer">
          <p>{'点呼完了!'}</p>
        </div>
      ) : (
        <div className="bg-red-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer flex-col" onClick={handleCheckIn}>
          <p> {'点呼!'}</p>
          <p className="text-xl mt-5">{'残り時間'}</p>
          <p className="text-xl">{'00:00'}</p>
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : '時間内に点呼に応答してください！'}</p>
      {isDone ? <Button text="戻る" arrow onClick={() => navigate('/index')} /> : <></>}
    </div>
  );
};

export default Call;
