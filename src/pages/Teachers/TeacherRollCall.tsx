import { useCallback, useEffect, useState, type FormEvent } from 'react';
import KanaSearchModal from '../../components/KanaSearchModal';
import type { StudentDTO } from '../../helpers/domainApi';
import MDButton, { BackToHome } from '../../components/MDButton';
import GroupEditorModal from '../../components/GroupEditorModal';
import { useAuth } from '../../auth-context';
import { rollCallApi, studentApi } from '../../helpers/domainApi';
import { useNavigate } from 'react-router-dom';
import CenterMessage from '../../components/CenterMessage';
import StudentPresetSelector, { type RollCallGroup } from '../../components/StudentPresetSelector';
const TeacherRollCall = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const DEFAULT_NOTIFICATION_TITLE = '点呼が開始されました';
  const DEFAULT_NOTIFICATION_BODY = 'アプリを開いて出欠を確認してください。';

  const [allStudents, setAllStudents] = useState<StudentDTO[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<StudentDTO[]>([]);
  const [kanaModalOpen, setKanaModalOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [targetStudents, setTargetStudents] = useState<string>('default');
  const [rollCallGroups, setRollCallGroups] = useState<RollCallGroup[]>([]);
  const [isGroupEditorOpen, setGroupEditorOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState(DEFAULT_NOTIFICATION_TITLE);
  const [notificationBody, setNotificationBody] = useState(DEFAULT_NOTIFICATION_BODY);
  const [notificationLink, setNotificationLink] = useState('');

  const fetchRollCallGroups = useCallback(async () => {
    if (!token) return;
    try {
      const groups = await rollCallApi.groups();
      setRollCallGroups(groups as RollCallGroup[]);
    } catch (error) {
      console.error('点呼グループの取得に失敗:', error);
    }
  }, [token]);

  const fetchAllStudents = useCallback(async () => {
    if (!token) return;
    try {
      const students = await studentApi.list({ staleWhileRevalidate: true });
      students.sort((a, b) => (a.gakuseki < b.gakuseki ? -1 : a.gakuseki > b.gakuseki ? 1 : 0));
      setAllStudents(students);
    } catch (e) {
      console.error('生徒データの取得に失敗:', e);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchAllStudents();
    fetchRollCallGroups();
  }, [token, fetchAllStudents, fetchRollCallGroups]);

  const handleCallSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();

      if (!user || !token) {
        alert('ログインしていません。');
        return;
      }

      if (selectedStudents.length > 0) {
        const ids = selectedStudents.map((s) => `【${s.gakuseki} ${s.surname} ${s.forename}】`).join('\n');
        if (!window.confirm(`下記の生徒に点呼を発動します。\n${ids}\nよろしいですか?`)) {
          alert('点呼を中止しました。');
          return;
        }
      } else {
        if (targetStudents === 'default') {
          alert('送信先のプリセットを選択してください。');
          return;
        } else if (targetStudents === 'all') {
          if (!window.confirm('現在、\n【 全員 】\nに通知を送信する設定です。\n生徒全員に対して一斉に点呼がかかりますが、よろしいですか?')) {
            alert('点呼を中止しました。');
            return;
          }
        } else {
          if (!window.confirm(`現在、\n【${rollCallGroups.find((x) => x.name === targetStudents)?.name}】\nに通知を送信する設定です。\nよろしいですか?`)) {
            alert('点呼を中止しました。');
            return;
          }
        }
      }

      const requestBody: {
        teacher_id: number;
        duration_minutes: number;
        specific_student_ids?: number[];
        group_name?: string;
        notification_title?: string;
        notification_body?: string;
        notification_link?: string;
      } = {
        teacher_id: Number(user.userId),
        duration_minutes: durationMinutes
      };

      if (selectedStudents.length > 0) {
        requestBody.specific_student_ids = selectedStudents.map((s) => s.gakuseki);
      } else if (targetStudents !== 'all') {
        requestBody.group_name = targetStudents;
      }

      const trimmedTitle = notificationTitle.trim();
      const trimmedBody = notificationBody.trim();
      const trimmedLink = notificationLink.trim();

      if (trimmedTitle.length > 0) {
        requestBody.notification_title = trimmedTitle;
      }
      if (trimmedBody.length > 0) {
        requestBody.notification_body = trimmedBody;
      }
      if (trimmedLink.length > 0) {
        requestBody.notification_link = trimmedLink;
      }

      try {
        const { rollCallId } = await rollCallApi.start(requestBody);

        navigate(`/teacher/call-viewer?id=${rollCallId}`);
      } catch (error) {
        console.error('点呼の開始に失敗しました:', error);
        alert(`点呼の開始に失敗しました.\n${(error as Error).message}`);
      }
    },
    [user, token, selectedStudents, targetStudents, durationMinutes, rollCallGroups, navigate, notificationTitle, notificationBody, notificationLink]
  );

  if (!user) return <CenterMessage>認証が必要です。</CenterMessage>;

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <BackToHome user={user} />
      <section id="call" className="m-2 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-md">
          <div className="flex flex-col justify-between items-center w-full">
            <p className="m-[10px] text-2xl font-bold">{'点呼システム'}</p>
            <MDButton
              text="点呼一覧へ"
              arrowRight
              link="/teacher/roll-call-list"
              prefetchKey="rollCalls"
              prefetchFetcher={async () => rollCallApi.listForTeacher(user!.userId, { alwaysFetch: true })}
            />
            <MDButton text="送信先ﾘｽﾄを編集" arrowRight color="white" onClick={() => setGroupEditorOpen(true)} />
          </div>

          <form className="w-full mt-4" onSubmit={handleCallSubmit}>
            <StudentPresetSelector value={targetStudents} onChange={setTargetStudents} rollCallGroups={rollCallGroups} />
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notification_title">
                {'通知タイトル'}
              </label>
              <input
                id="notification_title"
                type="text"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notification_body">
                {'通知本文'}
              </label>
              <textarea
                id="notification_body"
                value={notificationBody}
                onChange={(e) => setNotificationBody(e.target.value)}
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="notification_link">
                {'通知リンク（任意）'}
              </label>
              <input
                id="notification_link"
                type="text"
                value={notificationLink}
                onChange={(e) => setNotificationLink(e.target.value)}
                placeholder="例: /call?id=123"
                className="w-full rounded border border-gray-300 px-3 py-2 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="mt-1 text-xs text-gray-500">{'未入力の場合は自動的に現在の点呼ページへ遷移するリンクになります。'}</p>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">{'点呼時間 (分)'}</label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setDurationMinutes(period)}
                    className={`py-2 px-4 rounded cursor-pointer focus:outline-none ${durationMinutes === period ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">{'カタカナ検索で生徒を選択'}</label>
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 flex-wrap">
                  {selectedStudents.map((s) => (
                    <div key={s.gakuseki} className="flex items-center bg-blue-100 rounded px-2 py-1 text-sm mb-1">
                      <span>{`${s.surname} ${s.forename}`}</span>
                      <button
                        type="button"
                        className="ml-1 text-red-500 hover:text-red-700"
                        onClick={() => setSelectedStudents(selectedStudents.filter((x) => x.gakuseki !== s.gakuseki))}
                        aria-label="削除">
                        ×
                      </button>
                    </div>
                  ))}
                  <button type="button" className="bg-blue-500 text-white rounded px-2 py-1 hover:bg-blue-600" onClick={() => setKanaModalOpen(true)}>
                    生徒を追加
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-1">{'ここで選択した生徒にのみ通知が送信されます。空の場合は、選択されたプリセットが適用されます。'}</p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <MDButton text="点呼開始" arrowRight color="red" type="submit" />
            </div>
          </form>
        </div>
      </section>
      <KanaSearchModal
        isOpen={kanaModalOpen}
        onClose={() => setKanaModalOpen(false)}
        allStudents={allStudents}
        onStudentSelect={(student) => {
          if (!selectedStudents.some((s) => s.gakuseki === student.gakuseki)) {
            setSelectedStudents([...selectedStudents, student]);
          }
        }}
        closeOnSelect={true}
      />
      <GroupEditorModal
        isOpen={isGroupEditorOpen}
        onClose={() => setGroupEditorOpen(false)}
        token={token}
        allStudents={allStudents}
        rollCallGroups={rollCallGroups}
        onGroupsUpdated={fetchRollCallGroups}
      />
    </div>
  );
};

export default TeacherRollCall;
