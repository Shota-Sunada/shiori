import { useEffect, useState, useCallback, useMemo } from 'react';
import { usePolling } from '../hooks/usePolling';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { rollCallApi } from '../helpers/domainApi';
import { POLL_INTERVALS, ROLLCALL_GRACE_OFFSET_SECONDS } from '../config/constants';
import MDButton from '../components/MDButton';
import { useAuth } from '../auth-context';
import type { RollCall, RollCallStudent } from '../interface/models';
import { FaArrowRight } from 'react-icons/fa';
import CenterMessage from '../components/CenterMessage';
import '../styles/table.css';

type Student = RollCallStudent;

// オフセットは config/constants.ts で集中管理

const TeacherRollCallViewer = () => {
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

  const fetchData = useCallback(async () => {
    if (!rollCallId || !token) return;
    try {
      const data = await rollCallApi.detail(rollCallId);
      setRollCall(data.rollCall as RollCall);
      setStudents(data.students);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [rollCallId, token]);

  usePolling(fetchData, POLL_INTERVALS.rollCallViewer, [fetchData, rollCallId, token]);

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

  const formattedTime = useMemo(() => {
    const adjusted = remainingTime - ROLLCALL_GRACE_OFFSET_SECONDS;
    if (adjusted <= 0) return '00:00';
    const m = Math.floor(adjusted / 60);
    const sec = adjusted % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  const onEndSession = useCallback(async () => {
    if (!rollCallId || !token || !rollCall) return;

    if (!window.confirm('本当に点呼を終了しますか？')) return;

    try {
      await rollCallApi.end(rollCallId, rollCall.teacher_id);
      alert('点呼を終了しました。');
      navigate('/teacher/roll-call-list');
    } catch (error) {
      console.error('点呼の終了に失敗しました:', error);
      alert('点呼の終了に失敗しました。');
    }
  }, [rollCallId, token, navigate, rollCall]);

  const endButton = (disabled: boolean) => (
    <div className="m-3 flex items-center justify-center">
      <MDButton
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
            <MDButton text="閉じる" arrowLeft onClick={onClose} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <CenterMessage>読み込み中...</CenterMessage>;
  if (error)
    return (
      <CenterMessage>
        <p className="text-red-500 mb-4">エラー: {error}</p>
        <MDButton
          text="一覧へ戻る"
          arrowLeft
          link="/teacher/roll-call-list"
          prefetchKey="rollCalls"
          prefetchFetcher={async () => (rollCall ? rollCallApi.listForTeacher(rollCall.teacher_id, { alwaysFetch: true }) : [])}
        />
      </CenterMessage>
    );

  const checkedInCount = students.filter((s) => s.status === 'checked_in').length;
  const absentCount = students.filter((s) => s.absence_reason).length;
  const unresponsiveCount = students.filter((s) => s.status === 'targeted' && !s.absence_reason).length;

  const renderDate = (ms: number) => {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const hh = d.getHours();
    const mm = d.getMinutes().toString().padStart(2, '0');
    return <span className="inline-block leading-tight">{`${y}年${m}月${day}日\n${hh}時${mm}分`}</span>;
  };

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
          <p className="text-lg mx-1 text-left">{formattedTime}</p>
          {rollCall ? (
            <>
              <p className="text-lg mx-1 text-right">{'開始: '}</p>
              <p className="text-lg mx-1 text-left whitespace-pre-line">{renderDate(rollCall.created_at)}</p>
              <p className="text-lg mx-1 text-right">{'終了予定: '}</p>
              <p className="text-lg mx-1 text-left whitespace-pre-line">{renderDate(rollCall.expires_at)}</p>
            </>
          ) : null}
        </div>

        {students.length > 20 ? endButton(!rollCall?.is_active || remainingTime <= 0) : <></>}

        <div className="overflow-x-auto">
          <table className="table-base table-rounded table-shadow">
            <thead>
              <tr>
                <th className="p-2 text-left">組</th>
                <th className="p-2 text-left">番号</th>
                <th className="p-2 text-left">氏名</th>
                <th className="p-2 text-left">状態</th>
                <th className="p-2 text-left">不在詳細</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const label = student.status === 'checked_in' ? '応答済み' : student.absence_reason ? '不在' : '未応答';
                const badgeClass = label === '応答済み' ? 'table-badge-green' : label === '不在' ? 'table-badge-yellow' : 'table-badge-red';
                return (
                  <tr key={student.gakuseki} className="text-center">
                    <td className="p-2">{student.class}</td>
                    <td className="p-2">{student.number}</td>
                    <td className="p-2 whitespace-nowrap">{`${student.surname} ${student.forename}`}</td>
                    <td className="p-2">
                      <span className={`table-badge ${badgeClass}`}>{label}</span>
                    </td>
                    <td className="p-2">
                      {student.absence_reason ? (
                        <button
                          type="button"
                          onClick={() => setModal({ isOpen: true, reason: student.absence_reason || '', location: student.location || '' })}
                          className="inline-flex items-center justify-center rounded-full bg-blue-50 hover:bg-blue-100 transition px-2 py-1"
                          aria-label="不在理由を表示">
                          <FaArrowRight size={16} className="text-blue-600" />
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {endButton(!rollCall?.is_active || remainingTime <= 0)}
      </div>

      <MDButton
        text="点呼一覧へ戻る"
        arrowLeft
        link="/teacher/roll-call-list"
        prefetchKey="rollCalls"
        prefetchFetcher={async () => (rollCall ? rollCallApi.listForTeacher(rollCall.teacher_id, { alwaysFetch: true }) : [])}
      />
      <ReasonModal isOpen={modal.isOpen} reason={modal.reason} location={modal.location} onClose={() => setModal({ isOpen: false, reason: '', location: '' })} />
    </div>
  );
};

export default TeacherRollCallViewer;
