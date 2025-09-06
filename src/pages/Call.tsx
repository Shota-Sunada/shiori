import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  created_at: number; // Add created_at as number
  expires_at: number; // Change expires_at to number
}

const Call = () => {
  const [isDone, setIsDone] = useState<boolean>(false);
  const [searchParams] = useSearchParams();
  const rollCallId = searchParams.get('id');
  const { user, token } = useAuth();
  const [rollCall, setRollCall] = useState<RollCall | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0); // Remaining time in seconds
  const [showAbsenceForm, setShowAbsenceForm] = useState<boolean>(false);
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<string>('');

  useEffect(() => {
    if (showAbsenceForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAbsenceForm]);

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

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (rollCall && rollCall.is_active) {
      const calculateRemainingTime = () => {
        const now = Date.now();
        const created = rollCall.created_at;
        const expires = rollCall.expires_at;

        const totalDuration = expires - created;
        const elapsedTime = now - created;
        const diff = Math.max(0, Math.floor((totalDuration - elapsedTime) / 1000));
        setRemainingTime(diff);

        if (diff === 0) {
          // Roll call has expired, update its status
          setRollCall((prev) => (prev ? { ...prev, is_active: false } : null));
        }
      };

      calculateRemainingTime(); // Initial calculation
      timer = setInterval(calculateRemainingTime, 1000); // Update every second
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [rollCall]);

  const formatTime = (totalSeconds: number) => {
    totalSeconds -= 20;
    if (totalSeconds <= 0) {
      return '00:00';
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAbsenceSubmit = async () => {
    if (!user || !rollCallId || !token || !absenceReason) {
      alert('エラーが発生しました。理由を入力してください。');
      return;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/absence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          roll_call_id: rollCallId,
          student_id: user.userId,
          reason: absenceReason,
          location: currentLocation
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        setShowAbsenceForm(false);
      } else {
        throw new Error(data.message || '不明なエラー');
      }
    } catch (error) {
      console.error('不在届の送信中にエラーが発生しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
  };

  const handleCheckIn = async () => {
    if (!user || !rollCallId || !token) {
      alert('エラーが発生しました。');
      return;
    }

    if (!rollCall?.is_active || remainingTime <= 0) {
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
        <Button text="戻る" arrowRight link="/index" />
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
            rollCall?.is_active && remainingTime > 0 ? 'bg-red-500 cursor-pointer' : 'bg-gray-500'
          }`}
          onClick={handleCheckIn}>
          {rollCall?.is_active && remainingTime > 0 ? (
            <>
              <p> {'点呼!'}</p>
              <p className="text-xl mt-5">{'残り時間'}</p>
              <p className="text-xl">{formatTime(remainingTime)}</p>
            </>
          ) : (
            <p>{'終了'}</p>
          )}
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : rollCall?.is_active && remainingTime > 0 ? '時間内に点呼に応答してください！' : 'この点呼は終了しています。'}</p>
      {isDone || !rollCall?.is_active || remainingTime < 0 ? <Button text="戻る" arrowRight link="/index" /> : <></>}

      {!isDone && rollCall?.is_active && remainingTime > 0 ? (
        <div className="mt-5">
          <Button text="点呼できません" arrowRight onClick={() => setShowAbsenceForm(true)} />
        </div>
      ) : (
        <></>
      )}

      {showAbsenceForm ? (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-transparent backdrop-blur-sm">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{'不在理由・詳細情報'}</h2>
            <textarea className="w-full p-2 border rounded mb-4" rows={4} placeholder="理由を入力してください" value={absenceReason} onChange={(e) => setAbsenceReason(e.target.value)} />
            <input type="text" className="w-full p-2 border rounded" placeholder="現在地を入力してください" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)} />
            <div className="flex justify-end space-x-2 mt-4">
              <Button text="キャンセル" onClick={() => setShowAbsenceForm(false)} />
              <Button text="送信" arrowRight onClick={handleAbsenceSubmit} />
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default Call;
