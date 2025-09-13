import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { StudentDTO } from '../helpers/domainApi';
import { studentApi } from '../helpers/domainApi';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import IndexTable from '../components/IndexTable';
import MDButton from '../components/MDButton';
import CenterMessage from '../components/CenterMessage';
import { appFetch } from '../helpers/apiClient';
import Message from '../components/Message';

interface ActiveRollCall {
  id: string;
  teacher_id: string;
  created_at: string;
}

const Index = () => {
  const { user, token, loading } = useAuth();

  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<StudentDTO | null | undefined>(undefined); // undefined: ロード中, null: 404 等
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
        const data = await studentApi.getById(user.userId); // 単体取得は頻度低いので TTL なし
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

      <Message>
        <div className="m-1">
          <p>大きな荷物(スーツケース等)は旅行出発前に学校からホテルへトラックで搬送されます。</p>
          <p>また、最終日は、宿舎から自宅へ搬送されます。</p>
        </div>
        <div className="m-1">
          <p>【事前荷物送りのご案内】</p>
          <p>理系クラス: 9月29日 10:00~11:00</p>
          <p>文系クラス: 9月29日 11:00~12:00</p>
          <p>上記の時間に、搬送する荷物を学校に持参してください。</p>
        </div>
        <div className="m-1">
          <Message type="notice">
            <p>貴重品、1日目に必要なものは搬送荷物に含めないでください！</p>
            <p>スーツケースに鍵をかけて搬送する場合は、鍵を忘れずに持ってくるようにしてください！</p>
          </Message>
        </div>
        <div className="m-1">
          <p>10月3日の宿舎(フジプレミアムリゾート)から、自宅に荷物が搬送されます。</p>
          <p>自宅への到着は10月5日または10月6日の予定。</p>
          <Message type="notice">
            <p>貴重品、4日目に必要なものは搬送荷物に含めないでください！</p>
          </Message>
        </div>
      </Message>

      {!user.is_teacher && (
        <div className="mt-4">
          <MDButton text="持ち物チェッカー" arrowRight link="/goods-check" />
          <MDButton text="点呼履歴" arrowRight link="/roll-call-history" />
        </div>
      )}
    </div>
  );
};

export default Index;
