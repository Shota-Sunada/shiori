import { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { StudentDTO } from '../helpers/domainApi';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import IndexTable from '../components/IndexTable';
import MDButton from '../components/MDButton';
import LoadingPage from '../components/LoadingPage';
import { appFetch } from '../helpers/apiClient';
import Message from '../components/Message';
import NotificationBanner from '../components/NotificationBanner';
import Memo from '../components/Memo';
import { isOffline } from '../helpers/isOffline';
import { CacheKeys } from '../helpers/cacheKeys';

// interface ActiveRollCall {
//   id: string;
//   teacher_id: string;
//   created_at: string;
// }

const Index = () => {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState<StudentDTO | null | undefined>(undefined); // undefined: ロード中, null: 404 等
  const [studentLoading, setStudentLoading] = useState<boolean>(true);
  // const [activeRollCall, setActiveRollCall] = useState<ActiveRollCall | null>(null);

  // FCMトークンの不一致チェック（ログイン直後は1回だけスキップ）
  useEffect(() => {
    (async () => {
      if (isOffline()) {
        console.log('オフラインなので、FCMトークンのチェックを行いません。');
      }

      try {
        // サーバーのFCMトークン取得
        const data = await appFetch<{ token: string | null }>(`${SERVER_ENDPOINT}/api/fcm-token/me/fcm-token`, { requiresAuth: true, alwaysFetch: true });
        const serverToken = data.token;
        // クライアントのFCMトークン取得
        let clientToken: string | null = null;
        try {
          clientToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
        } catch {
          // 権限未許可など
        }
        if (serverToken && clientToken && serverToken !== clientToken) {
          // FCMトークンが異なる場合はサーバーにクライアントのトークンを再登録
          if (user?.userId && clientToken && !isOffline()) {
            await appFetch(`${SERVER_ENDPOINT}/register-token`, {
              method: 'POST',
              jsonBody: { userId: user.userId, token: clientToken },
              requiresAuth: true
            });
          }
        }
      } catch {
        // サーバーAPI失敗時は警告しない
      }
    })();
  }, [logout, user?.userId]);
  // const pollTimerRef = useRef<number | null>(null);

  // 生徒データ取得 (1回 + キャッシュ)
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user || user.is_teacher || !token) {
        setStudentData(null); // 教員の場合は null 相当で扱う
        setStudentLoading(false);
        return;
      }
      try {
        // 生徒データ取得API呼び出し例（適宜修正）
        const data = await appFetch<StudentDTO>(`${SERVER_ENDPOINT}/api/students/${user.userId}`, { requiresAuth: true, cacheKey: CacheKeys.students.byId(user.userId) });
        setStudentData(data);
      } catch {
        setStudentData(null);
      } finally {
        setStudentLoading(false);
      }
    };
    fetchStudent();
  }, [user, token]);

  // 有効な点呼ポーリング (5秒間隔)
  // useEffect(() => {
  //   const fetchActive = async () => {
  //     if (!user || user.is_teacher || !token) return;
  //     try {
  //       const rc = await appFetch<ActiveRollCall>(`${SERVER_ENDPOINT}/api/roll-call/active?student_id=${user.userId}`, {
  //         requiresAuth: true,
  //         alwaysFetch: true // 毎回取得
  //       });
  //       setActiveRollCall(rc);
  //     } catch {
  //       // 404 等は active なし
  //       setActiveRollCall(null);
  //     }
  //   };
  //   if (user && !user.is_teacher && token) {
  //     fetchActive();
  //     pollTimerRef.current = window.setInterval(fetchActive, 5000);
  //   }
  //   return () => {
  //     if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
  //   };
  // }, [user, token]);

  // 教員は教師トップへ
  useEffect(() => {
    if (user?.is_teacher) navigate('/teacher');
  }, [user?.is_teacher, navigate]);

  if (loading || studentLoading) return <LoadingPage message="読込中..." />;
  if (!user) return <LoadingPage message="ユーザーデータ読込中..." />;
  if (studentData === undefined) return <LoadingPage message="生徒データ読込中..." />;

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      {/* {activeRollCall && (
        <div className="w-full max-w-md p-4 mb-4 text-xl text-center text-white bg-red-500 rounded-lg cursor-pointer" onClick={() => navigate(`/call?id=${activeRollCall.id}`)}>
          点呼が開始されています。ここをタップして出席を確認してください。
        </div>
      )} */}
      {studentData ? (
        <p className="m-[10px] text-2xl">
          {'ようこそ、'}
          {studentData.surname}
          {studentData.forename}
          {'さん。'}
        </p>
      ) : (
        <div className="m-[10px] flex flex-col items-center justify-center">
          <p className="text-2xl text-center">{'生徒データが見つかりませんでした。'}</p>
          <p className="text-sm text-center">{'管理者にご連絡ください。'}</p>
        </div>
      )}
      {/* 通知バナー: 全員宛メッセージ */}
      <NotificationBanner onClick={() => navigate('/messages')} />

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

      {/* メモ欄 */}
      <Memo />

      {!user.is_teacher && (
        <div className="mt-4">
          <MDButton text="持ち物チェッカー" arrowRight link="/goods-check" />
          {/* <MDButton text="点呼履歴" arrowRight link="/roll-call-history" /> */}
        </div>
      )}
    </div>
  );
};

export default Index;
