import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SERVER_ENDPOINT } from '../App';
import Button from '../components/Button';
import { useAuth } from '../auth-context';
import type { RollCall } from './TeacherRollCallList';
import { FaArrowRight } from 'react-icons/fa';

interface Student {
  gakuseki: number;
  surname: string;
  forename: string;
  class: number;
  number: number;
  status: 'targeted' | 'checked_in';
  absence_reason?: string;
  location?: string;
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
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [modal, setModal] = useState<{ isOpen: boolean; reason: string; location: string }>({ isOpen: false, reason: '', location: '' });

  useEffect(() => {
    if (modal.isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [modal.isOpen]);

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
          setRollCall((prev) => (prev ? { ...prev, is_active: false } : null));
        }
      };

      calculateRemainingTime();
      timer = setInterval(calculateRemainingTime, 1000);
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

  const endButton = (disabled: boolean) => (
    <div className="m-3 flex items-center justify-center">
      <Button
        onClick={onEndSession}
        disabled={disabled}
        text={rollCall?.is_active && remainingTime > 0 ? '点呼終了' : '点呼は終了しています'}
        color={disabled ? 'gray' : rollCall?.is_active && remainingTime > 0 ? 'red' : 'green'}
      />
    </div>
  );

  const ReasonModal = ({ isOpen, reason, location, onClose }: { isOpen: boolean; reason: string; location: string; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 modal-overlay">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4">{'不在理由・詳細情報'}</h2>
          <p>
            <strong>{'理由: '}</strong>
            {reason}
          </p>
          <p>
            <strong>{'現在地: '}</strong>
            {location}
          </p>
          <div className="text-center mt-4">
            <Button text="閉じる" arrowLeft onClick={onClose} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <p className="text-center mt-8">{'読み込み中...'}</p>;
  }

  if (error) {
    return (
      <p className="text-center mt-8 text-red-500">
        {'エラー: '}
        {error}
      </p>
    );
  }

  const checkedInCount = students.filter((s) => s.status === 'checked_in').length;
  const absentCount = students.filter((s) => s.absence_reason).length;
  const unresponsiveCount = students.filter((s) => s.status === 'targeted' && !s.absence_reason).length;

  return (
    <div className="flex flex-col items-center justify-center m-4">
      <div className="w-full max-w-[90dvw] p-4 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">{rollCall?.is_active ? '点呼実施中' : '点呼記録'}</h1>

        <div className="grid grid-cols-2 m-2">
          <p className="text-lg mx-1 text-right">{'開始した先生: '}</p>
          <p className="text-lg mx-1 text-left">{rollCall?.teacher_id}</p>
          <p className="text-lg mx-1 text-right">{'応答済みの生徒: '}</p>
          <p className="text-lg mx-1 text-left">
            {checkedInCount}
            {'人'}
          </p>
          <p className="text-lg mx-1 text-right">{'不在の生徒: '}</p>
          <p className="text-lg mx-1 text-left">
            {absentCount}
            {'人'}
          </p>
          <p className="text-lg mx-1 text-right">{'未応答の生徒: '}</p>
          <p className="text-lg mx-1 text-left">
            {unresponsiveCount}
            {'人'}
          </p>
          <p className="text-lg mx-1 text-right">{'残り時間: '}</p>
          <p className="text-lg mx-1 text-left">{formatTime(remainingTime)}</p>
        </div>

        {students.length > 20 ? endButton(!rollCall?.is_active || remainingTime <= 0) : <></>}

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-200">
              <tr>
                <th className="py-2 px-1 border-b">{'組'}</th>
                <th className="py-2 px-1 border-b">{'番号'}</th>
                <th className="py-2 px-1 border-b">{'氏名'}</th>
                <th className="py-2 px-1 border-b">{'状態'}</th>
                <th className="py-2 px-1 border-b">{'不在詳細'}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.gakuseki} className="text-center">
                  <td className="py-2 px-1 border-b">{student.class}</td>
                  <td className="py-2 px-1 border-b">{student.number}</td>
                  <td className="py-2 px-1 border-b">{`${student.surname} ${student.forename}`}</td>
                  <td className="py-2 px-1 border-b">
                    {student.status === 'checked_in' ? (
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-green-500 rounded-full">{'応答済み'}</span>
                    ) : student.absence_reason ? (
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-yellow-500 rounded-full">{'不在'}</span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold text-white bg-red-500 rounded-full">{'未応答'}</span>
                    )}
                  </td>
                  <td className="px-3">
                    {student.absence_reason ? (
                      <div className="flex items-center justify-center">
                        <FaArrowRight
                          onClick={() => setModal({ isOpen: true, reason: student.absence_reason || '', location: student.location || '' })}
                          className="cursor-pointer bg-[#219ace30] rounded-2xl p-1.5"
                          size={'30px'}
                          color="#219bce"
                        />
                      </div>
                    ) : (
                      <></>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {endButton(!rollCall?.is_active || remainingTime <= 0)}
      </div>

      <Button text="点呼一覧へ戻る" arrowLeft link="/teacher/roll-call-list" />
      <ReasonModal isOpen={modal.isOpen} reason={modal.reason} location={modal.location} onClose={() => setModal({ isOpen: false, reason: '', location: '' })} />
    </div>
  );
};

export default TeacherCall;
