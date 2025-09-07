import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';
import MDButton from '../components/MDButton';
import CenterMessage from '../components/CenterMessage';
import { appFetch } from '../helpers/apiClient';

interface ActiveRollCall {
  id: string;
  teacher_id: string;
  created_at: string;
}

const Index = () => {
  const { user, token, loading } = useAuth();

  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<student | null | undefined>(undefined); // undefined: ロード中, null: 404 等
  const [studentLoading, setStudentLoading] = useState<boolean>(true);
  const [activeRollCall, setActiveRollCall] = useState<ActiveRollCall | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  // 生徒データ取得 (1回 + キャッシュ)
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user || user.is_teacher || !token) {
        setStudentData(null); // 教員の場合は null 相当で扱う
        setStudentLoading(false);
        return;
      }
      try {
        const data = await appFetch<student>(`${SERVER_ENDPOINT}/api/students/${user.userId}`, {
          requiresAuth: true,
          cacheKey: `student:${user.userId}`
        });
        setStudentData(data);
      } catch (e: unknown) {
        const msg = (e as Error).message || '';
        if (msg.includes('404')) {
          console.warn(`生徒ID「${user.userId}」のデータが見つかりませんでした。`);
          setStudentData(null);
        } else {
          console.error('生徒データ取得失敗:', e);
          setStudentData(null);
        }
      } finally {
        setStudentLoading(false);
      }
    };
    if (token) fetchStudent();
  }, [user, token]);

  // 有効な点呼ポーリング (5秒間隔)
  useEffect(() => {
    const fetchActive = async () => {
      if (!user || user.is_teacher || !token) return;
      try {
        const rc = await appFetch<ActiveRollCall>(`${SERVER_ENDPOINT}/api/roll-call/active?student_id=${user.userId}`, {
          requiresAuth: true,
          alwaysFetch: true // 毎回取得
        });
        setActiveRollCall(rc);
      } catch {
        // 404 等は active なし
        setActiveRollCall(null);
      }
    };
    if (user && !user.is_teacher && token) {
      fetchActive();
      pollTimerRef.current = window.setInterval(fetchActive, 5000);
    }
    return () => {
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
    };
  }, [user, token]);

  // 教員は教師トップへ
  useEffect(() => {
    if (user?.is_teacher) navigate('/teacher');
  }, [user?.is_teacher, navigate]);

  if (loading || studentLoading) return <CenterMessage>読込中...</CenterMessage>;
  if (!user) return <CenterMessage>ユーザーデータ読込中...</CenterMessage>;
  if (studentData === undefined) return <CenterMessage>生徒データ読込中...</CenterMessage>;

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      {activeRollCall && (
        <div className="w-full max-w-md p-4 mb-4 text-xl text-center text-white bg-red-500 rounded-lg cursor-pointer" onClick={() => navigate(`/call?id=${activeRollCall.id}`)}>
          点呼が開始されています。ここをタップして出席を確認してください。
        </div>
      )}
      {studentData ? (
        <p className="m-[10px] text-2xl">
          {'ようこそ、'}
          {studentData.surname}
          {studentData.forename}
          {'さん。'}
        </p>
      ) : (
        <div className="m-[10px] flex flex-col items-center justify-center">
          <p className=" text-2xl">{'生徒データが見つかりませんでした。'}</p>
          <p className="text-sm">{'管理者にご連絡ください。'}</p>
        </div>
      )}

      <IndexTable studentData={studentData} />

      {!user.is_teacher && (
        <div className="mt-4">
          <MDButton text="点呼履歴" arrowRight link="/roll-call-history" />
        </div>
      )}

      <section id="index">
        <div>{'目次 - 項目をクリックすると、そのページに移動します'}</div>
        <ol>
          <li>
            <p>{'予定表'}</p>
            <ol>
              <li>
                <a href="#day1">{'1日目'}</a>
              </li>
              <li>
                <a href="#day2">{'2日目'}</a>
              </li>
              <li>
                <a href="#day3">{'3日目'}</a>
              </li>
              <li>
                <a href="#day4">{'4日目'}</a>
              </li>
            </ol>
          </li>
          <li>
            <p>{'新幹線 座席表'}</p>
            <ol>
              <li>
                <a href="#shinkansen-nobori">{'上り (東京行)'}</a>
              </li>
              <li>
                <a href="#shinkansen-kudari">{'下り (広島行)'}</a>
              </li>
            </ol>
          </li>
        </ol>
      </section>

      <section id="days">
        <h2 id="day1">{'1日目'}</h2>
        <h2 id="day2">{'2日目'}</h2>
        <h2 id="day3">{'3日目'}</h2>
        <h2 id="day4">{'4日目'}</h2>
      </section>

      <section id="shinkansen">
        <h2 id="shinkansen-nobori">{'新幹線 (上り/東京行)'}</h2>
        <h2 id="shinkansen-kudari">{'新幹線 (下り/広島行)'}</h2>
      </section>
    </div>
  );
};

export default Index;
