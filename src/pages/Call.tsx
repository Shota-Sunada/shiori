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

interface RollCall {
  is_active: boolean;
}

const Call = () => {
  const [isDone, setIsDone] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const rollCallId = searchParams.get('id');
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [rollCall, setRollCall] = useState<RollCall | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRollCallStatus = async () => {
      if (!rollCallId || !user || !token) return;

      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call?id=${rollCallId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('点呼データの取得に失敗しました。');
        }
        const data = await response.json();
        setRollCall(data.rollCall);
        const currentUserStatus = data.students.find((student: StudentStatus) => student.gakuseki === user.userId);

        if (currentUserStatus && currentUserStatus.status === 'checked_in') {
          setIsDone(true);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    // 初回実行
    fetchRollCallStatus();

    // ポーリングを停止する条件
    const shouldStopPolling = isDone || (rollCall !== null && !rollCall.is_active);

    let intervalId: NodeJS.Timeout | null = null;

    if (!shouldStopPolling) {
      intervalId = setInterval(fetchRollCallStatus, 5000);
    }

    // クリーンアップ関数
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [rollCallId, user, token, isDone, rollCall]);

  const handleCheckIn = async () => {
    if (!user || !rollCallId || !token) {
      alert('エラーが発生しました。');
      return;
    }

    if (!rollCall?.is_active) {
      alert('この点呼はすでに終了しています。');
      return;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
        <div
          className={`text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center flex-col ${
            rollCall?.is_active ? 'bg-red-500 cursor-pointer' : 'bg-gray-500'
          }`}
          onClick={handleCheckIn}>
          {rollCall?.is_active ? (
            <>
              <p> {'点呼!'}</p>
              <p className="text-xl mt-5">{'残り時間'}</p>
              <p className="text-xl">{'00:00'}</p>
            </>
          ) : (
            <p>{'終了'}</p>
          )}
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : rollCall?.is_active ? '時間内に点呼に応答してください！' : 'この点呼は終了しています。'}</p>
      {isDone ? <Button text="戻る" arrow onClick={() => navigate('/index')} /> : <></>}
    </div>
  );
};

export default Call;
