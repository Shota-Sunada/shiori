import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';
import CenterMessage from '../components/CenterMessage';

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

  const fetchRollCallStatus = useCallback(async () => {
    if (!rollCallId || !user || !token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call?id=${rollCallId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('点呼データの取得に失敗しました。');
      const data = await response.json();
      setRollCall(data.rollCall);
      const currentUserStatus = data.students.find((s: StudentStatus) => s.gakuseki === user.userId);
      if (currentUserStatus?.status === 'checked_in') setIsDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rollCallId, user, token]);

  useEffect(() => {
    fetchRollCallStatus();
    const shouldStop = isDone || (rollCall && !rollCall.is_active);
    if (shouldStop) return;
    const id = setInterval(fetchRollCallStatus, 5000);
    return () => clearInterval(id);
  }, [fetchRollCallStatus, isDone, rollCall]);

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

  const formattedTime = useMemo(() => {
    const s = remainingTime - 20; // 仕様: 実際より20秒短く表示する？ (元実装踏襲)
    if (s <= 0) return '00:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  const renderDate = (ms?: number) => {
    if (!ms) return null;
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes().toString().padStart(2, '0');
    return <span className="inline-block leading-tight whitespace-pre-line">{`${y}年${m}月${day}日\n${hh}時${mm}分`}</span>;
  };

  const handleAbsenceSubmit = useCallback(async () => {
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
  }, [user, rollCallId, token, absenceReason, currentLocation]);

  const handleCheckIn = useCallback(async () => {
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
  }, [user, rollCallId, token, rollCall?.is_active, remainingTime]);

  if (loading) return <CenterMessage>読込中...</CenterMessage>;
  if (error)
    return (
      <CenterMessage>
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <Button text="戻る" arrowLeft link="/index" />
      </CenterMessage>
    );

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
              <p className="text-xl">{formattedTime}</p>
            </>
          ) : (
            <p>{'終了'}</p>
          )}
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : rollCall?.is_active && remainingTime > 0 ? '時間内に点呼に応答してください！' : 'この点呼は終了しています。'}</p>
      {rollCall ? (
        <div className="mt-4 grid grid-cols-2 gap-x-2 text-sm">
          <p className="text-right">{'開始: '}</p>
          <p className="whitespace-pre-line">{renderDate(rollCall.created_at)}</p>
          <p className="text-right">{'終了予定: '}</p>
          <p className="whitespace-pre-line">{renderDate(rollCall.expires_at)}</p>
        </div>
      ) : null}
      {isDone || !rollCall?.is_active || remainingTime < 0 ? <Button text="戻る" arrowLeft link="/index" /> : <></>}

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
