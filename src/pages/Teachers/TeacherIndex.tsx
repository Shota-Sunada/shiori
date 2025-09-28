import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth-context';
import MDButton from '../../components/MDButton';
import CenterMessage from '../../components/CenterMessage';
// SERVER_ENDPOINT 直接利用を削除 (domainApi 経由)
import type { Teacher } from '../../interface/models';
import { teacherApi } from '../../helpers/domainApi';
import IndexTable from '../../components/IndexTable';
// 生徒 IndexTable と同じ幅/スタイルを適用するため CSS を追加インポート
import '../../styles/index-table.css';
import Memo from '../../components/Memo';
import NotificationBanner from '../../components/NotificationBanner';

const TeacherIndex = () => {
  const { user, loading, token } = useAuth();
  const navigate = useNavigate();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [teacherError, setTeacherError] = useState<string | null>(null);

  // 認証チェック
  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  const fetchTeacherData = useCallback(async () => {
    if (!user?.userId || !token) return;
    try {
      const data = await teacherApi.self(user.userId);
      setTeacherData(data as Teacher);
      setTeacherError(null);
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      const msg = (error as Error).message;
      if (msg.includes('404')) {
        setTeacherError('先生データが登録されていません。管理者に先生情報の登録を依頼してください。');
      } else {
        setTeacherError('先生データの取得に失敗しました。通信環境を確認して再読み込みしてください。');
      }
      setTeacherData(null);
    }
  }, [user?.userId, token]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // 教員一覧取得は不要（IndexTable 内で引率表示用に処理）

  if (loading || !user) return <CenterMessage>読込中...</CenterMessage>;

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <div className="m-2 flex flex-col items-center justify-center">
        <p className="m-[10px] text-2xl">{'ようこそ、先生用ページへ'}</p>
        <p className="text-xl text-center">
          {teacherData ? `${teacherData.surname} ${teacherData.forename} 先生` : user.is_teacher ? '先生データ未登録' : '管理者'}
          {'としてログイン中'}
        </p>
        {teacherError && <p className="text-sm text-red-600 mt-2">{teacherError}</p>}
      </div>

      <NotificationBanner onClick={() => navigate('/messages')} />

      <IndexTable teacherData={teacherData} />

      <Memo />

      <MDButton text="生徒を検索" arrowRight link="/teacher/search"></MDButton>
      <MDButton text="メッセージ送信" arrowRight link="/teacher/messages"></MDButton>
      {/* <MDButton text="点呼" arrowRight link="/teacher/call"></MDButton> */}
      <MDButton text="お楽しみ会" arrowRight link="/otanoshimi" color="green"></MDButton>
    </div>
  );
};

export default TeacherIndex;
