import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import MDButton from '../components/MDButton';
import CenterMessage from '../components/CenterMessage';
import { appFetch } from '../helpers/apiClient';

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
  teacher_id?: number; // どの先生が開始したか
  teacher_surname?: string;
  teacher_forename?: string;
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
    if (!rollCallId || !user) return;
    try {
      const data = await appFetch<{ rollCall: RollCall; students: StudentStatus[] }>(`${SERVER_ENDPOINT}/api/roll-call?id=${rollCallId}`, {
        requiresAuth: true,
        alwaysFetch: true // ポーリングなので都度取得
      });
      setRollCall(data.rollCall);
      const currentUserStatus = data.students.find((s) => s.gakuseki === user.userId);
      if (currentUserStatus?.status === 'checked_in') setIsDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rollCallId, user]);

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
    const s = remainingTime;
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
      const data = await appFetch<{ message: string }>(`${SERVER_ENDPOINT}/api/roll-call/absence`, {
        method: 'POST',
        requiresAuth: true,
        jsonBody: {
          roll_call_id: rollCallId,
          student_id: user.userId,
          reason: absenceReason,
          location: currentLocation
        }
      });
      alert(data.message);
      setShowAbsenceForm(false);
    } catch (error) {
      console.error('不在届の送信中にエラーが発生しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
    // tokenはappFetch内部のグローバル取得に移行済み
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rollCallId, absenceReason, currentLocation]);

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
      await appFetch(`${SERVER_ENDPOINT}/api/roll-call/check-in`, {
        method: 'POST',
        requiresAuth: true,
        jsonBody: { roll_call_id: rollCallId, student_id: user.userId }
      });
      setIsDone(true);
    } catch (error) {
      console.error('点呼への応答中にエラーが発生しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
    // tokenはappFetch内部のグローバル取得に移行済み
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, rollCallId, rollCall?.is_active, remainingTime]);

  if (loading) return <CenterMessage>読込中...</CenterMessage>;
  if (error)
    return (
      <CenterMessage>
        <p className="text-xl text-red-500 mb-4">{error}</p>
        <MDButton text="戻る" arrowLeft link={user?.is_teacher ? '/teacher' : '/'} />
      </CenterMessage>
    );

  return (
    <div className="flex flex-col items-center justify-center m-5">
      <p className="text-xl m-3">{'点呼です！'}</p>
      {(() => {
        const isActive = !!(rollCall?.is_active && remainingTime > 0);
        const base = 'group relative w-[40dvh] max-w-[85vw] aspect-square rounded-full flex items-center justify-center select-none ' + 'focus:outline-none transition-transform duration-200 ease-out';
        const activeStyle =
          'bg-gradient-to-br from-red-500 via-rose-500 to-rose-600 text-white ring-4 ring-red-300/40 ' + 'shadow-[0_10px_30px_rgba(244,63,94,0.45)] hover:scale-[1.03] active:scale-[0.98]';
        const doneStyle = 'bg-gradient-to-br from-emerald-500 to-green-600 text-white ring-4 ring-emerald-300/40 ' + 'shadow-[0_10px_30px_rgba(16,185,129,0.45)]';
        const inactiveStyle = 'bg-gradient-to-br from-gray-400 to-gray-500 text-white opacity-90 shadow-inner';

        const className = isDone ? `${base} ${doneStyle}` : isActive ? `${base} ${activeStyle}` : `${base} ${inactiveStyle}`;

        return (
          <button
            type="button"
            aria-label={isDone ? '点呼完了' : isActive ? '点呼に応答する' : '点呼は終了しています'}
            aria-disabled={!isActive}
            disabled={!isActive || isDone}
            onClick={() => (isActive ? handleCheckIn() : void 0)}
            className={className}>
            {/* アクティブ時: うっすら広がる波紋 */}
            {isActive ? <span className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/30 animate-ping" aria-hidden="true" /> : null}
            {/* ほんのり発光 */}
            <span
              className="pointer-events-none absolute inset-0 rounded-full blur-2xl opacity-40"
              style={{
                background: isDone ? 'radial-gradient(circle, rgba(16,185,129,0.35), transparent 60%)' : isActive ? 'radial-gradient(circle, rgba(244,63,94,0.35), transparent 60%)' : 'transparent'
              }}
              aria-hidden="true"
            />

            {/* 内容 */}
            {isDone ? (
              <div className="flex flex-col items-center justify-center text-white">
                <p className="text-4xl font-extrabold tracking-wide">{'点呼完了!'}</p>
              </div>
            ) : isActive ? (
              <div className="flex flex-col items-center justify-center text-white">
                <p className="text-4xl font-extrabold tracking-wide">{'点呼!'}</p>
                <p className="text-base mt-4 opacity-90">{'残り時間'}</p>
                <p className="text-2xl tabular-nums mt-1">{formattedTime}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-white">
                <p className="text-3xl font-bold tracking-wide">{'終了'}</p>
              </div>
            )}
          </button>
        );
      })()}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : rollCall?.is_active && remainingTime > 0 ? '時間内に点呼に応答してください！' : 'この点呼は終了しています。'}</p>
      {rollCall ? (
        <div className="mt-4 grid grid-cols-2 gap-x-2 text-sm">
          <p className="text-right">{'開始した先生: '}</p>
          <p>{rollCall.teacher_surname && rollCall.teacher_forename ? `${rollCall.teacher_surname} ${rollCall.teacher_forename}` : (rollCall.teacher_id ?? '不明')}</p>
          <p className="text-right">{'開始: '}</p>
          <p className="whitespace-pre-line">{renderDate(rollCall.created_at)}</p>
          <p className="text-right">{'終了予定: '}</p>
          <p className="whitespace-pre-line">{renderDate(rollCall.expires_at)}</p>
        </div>
      ) : null}
      {isDone || !rollCall?.is_active || remainingTime < 0 ? <MDButton text="戻る" arrowLeft link={user?.is_teacher ? '/teacher' : '/'} /> : <></>}

      {!isDone && rollCall?.is_active && remainingTime > 0 ? (
        <div className="mt-5">
          <MDButton text="点呼できません" arrowRight onClick={() => setShowAbsenceForm(true)} />
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
            <div className="flex flex-row items-center justify-center space-x-2 mt-4">
              <MDButton text="キャンセル" onClick={() => setShowAbsenceForm(false)} width="mobiry-button-150" color="white" />
              <MDButton text="送信" arrowRight onClick={handleAbsenceSubmit} width="mobiry-button-150" />
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
