import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';

const Call = () => {
  const [isDone, setIsDone] = useState<boolean>(false);
  const { rollCallId } = useParams<{ rollCallId: string }>();
  const { user } = useAuth();

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
        alert(data.message);
      } else {
        throw new Error(data.message || '不明なエラー');
      }
    } catch (error) {
      console.error('点呼への応答中にエラーが発生しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center m-5">
      <p className="text-xl m-3">{'点呼です！'}</p>
      {isDone ? (
        <div className="bg-green-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer">
          <p>{'点呼完了!'}</p>
        </div>
      ) : (
        <div
          className="bg-red-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer flex-col"
          onClick={handleCheckIn}>
          <p> {'点呼!'}</p>
          <p className="text-xl mt-5">{'残り時間'}</p>
          <p className="text-xl">{'00:00'}</p>
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : '時間内に点呼に応答してください！'}</p>
    </div>
  );
};

export default Call;
