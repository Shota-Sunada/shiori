import { useState, useEffect } from 'react';
import { appFetch } from '../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../config/serverEndpoint';
import { useAuth } from '../../auth-context';
import { teacherApi } from '../../helpers/domainApi';
import type { TeacherMessage } from '../../interface/messages';
import { BackToHome } from '../../components/MDButton';

const TeacherSendMessages = () => {
  const { user, token } = useAuth();
  const [title, setTitle] = useState<string>('');
  const TITLE_MAX_LENGTH = 50;
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState<number | null>(null);
  const [loadingTeacher, setLoadingTeacher] = useState<boolean>(true);
  const [myMessages, setMyMessages] = useState<TeacherMessage[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const fetchTeacher = async () => {
      if (!user || !user.userId) return;
      setLoadingTeacher(true);
      try {
        const teacher = await teacherApi.self(user.userId);
        setTeacherId(teacher.id);
      } catch {
        setTeacherId(null);
      } finally {
        setLoadingTeacher(false);
      }
    };
    if (user?.is_teacher) fetchTeacher();
  }, [user]);

  // 先生の過去メッセージ取得
  useEffect(() => {
    const fetchMyMessages = async () => {
      if (!teacherId || !token) return;
      try {
        const all = await appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true });
        setMyMessages(all.filter((m) => m.teacher_id === teacherId));
      } catch {
        setMyMessages([]);
      }
    };
    fetchMyMessages();
  }, [teacherId, token, sending]);

  const handleSend = async (e: React.FormEvent) => {
    if (!user || !token) return;
    if (!teacherId) {
      setError('先生情報の取得に失敗しました');
      return;
    }

    e.preventDefault();
    setSending(true);
    setSuccess(null);
    setError(null);
    try {
      await appFetch<Partial<TeacherMessage>>(`${SERVER_ENDPOINT}/api/messages`, {
        method: 'POST',
        jsonBody: { teacherId, title, message },
        requiresAuth: true
      });
      setSuccess('メッセージを送信しました');
      setTitle('');
      setMessage('');
    } catch {
      setError('送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  if (loadingTeacher) {
    return <div className="flex justify-center items-center h-40 text-lg text-gray-500">先生情報を取得中...</div>;
  }

  // 編集保存
  const handleEditSave = async (id: number) => {
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await appFetch<{ message: string; data: TeacherMessage }>(`${SERVER_ENDPOINT}/api/messages/${id}`, {
        method: 'PUT',
        requiresAuth: true,
        jsonBody: { title: editTitle, message: editMessage }
      });
      setEditingId(null);
      setEditTitle('');
      setEditMessage('');
      setEditError(null);
      // 直近編集分のみ反映
      setMyMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...res.data } : m)));
    } catch {
      setEditError('更新に失敗しました');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-blue-100 mt-10">
        <h2 className="text-3xl font-extrabold mb-8 text-blue-700 border-b-2 border-blue-200 pb-3 tracking-wide text-center">メッセージ送信</h2>
        <form onSubmit={handleSend} className="space-y-3">
          <div>
            <label htmlFor="title" className="block text-gray-700 font-semibold mb-1 text-lg">
              タイトル
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => {
                if (e.target.value.length <= TITLE_MAX_LENGTH) {
                  setTitle(e.target.value);
                }
              }}
              required
              maxLength={TITLE_MAX_LENGTH}
              className="w-full! p-3! m-0! border! border-blue-300! rounded-lg! focus:outline-none! focus:ring-2! focus:ring-blue-400! text-base! bg-blue-50! placeholder-gray-400! transition!"
              placeholder="タイトルを入力してください (最大50文字)"
            />
            <div className="text-right text-sm text-gray-500 mt-1">
              {title.length}/{TITLE_MAX_LENGTH} 文字
              {title.length === TITLE_MAX_LENGTH && <span className="text-red-500 ml-2">最大文字数です</span>}
            </div>
          </div>
          <div>
            <label htmlFor="message" className="block text-gray-700 font-semibold mb-1 text-lg">
              メッセージ
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              required
              className="w-full p-3 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-base bg-blue-50 placeholder-gray-400 resize-vertical transition"
              placeholder="生徒へのメッセージを入力してください"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !title.trim() || !message.trim() || title.length > TITLE_MAX_LENGTH}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-bold rounded-lg shadow hover:from-blue-600 hover:to-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg tracking-wide">
            {sending ? '送信中...' : '送信'}
          </button>
        </form>
        {success && <div className="mt-6 text-green-600 font-bold text-center text-lg animate-fade-in">{success}</div>}
        {error && <div className="mt-6 text-red-600 font-bold text-center text-lg animate-fade-in">{error}</div>}
      </div>

      {/* 過去の投稿一覧・編集 */}
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow border border-blue-100 p-6">
        <h3 className="text-xl font-bold mb-4 text-blue-700">過去の投稿</h3>
        {myMessages.length === 0 ? (
          <div className="text-gray-500 text-center">まだ投稿がありません。</div>
        ) : (
          <ul className="space-y-4">
            {myMessages.map((msg) => (
              <li key={msg.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                {editingId === msg.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editTitle} maxLength={TITLE_MAX_LENGTH} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-2 border rounded mb-1" />
                    <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} rows={4} className="w-full p-2 border rounded mb-1" />
                    <div className="flex gap-2">
                      <button
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        disabled={editLoading || !editTitle.trim() || !editMessage.trim() || editTitle.length > TITLE_MAX_LENGTH}
                        onClick={() => handleEditSave(msg.id)}>
                        保存
                      </button>
                      <button
                        className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={() => {
                          setEditingId(null);
                          setEditTitle('');
                          setEditMessage('');
                          setEditError(null);
                        }}>
                        キャンセル
                      </button>
                    </div>
                    {editError && <div className="text-red-500 text-sm mt-1">{editError}</div>}
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-blue-800 text-lg mb-1">{msg.title}</div>
                    <div className="text-gray-800 whitespace-pre-line mb-1">{msg.message}</div>
                    <div className="text-xs text-gray-400 mb-1">
                      投稿日: {new Date(msg.created_at).toLocaleString()}
                      {msg.updated_at && <span className="ml-2 text-blue-500">(最終編集: {new Date(msg.updated_at).toLocaleString()})</span>}
                    </div>
                    <button
                      className="text-blue-600 underline text-sm hover:text-blue-800"
                      onClick={() => {
                        setEditingId(msg.id);
                        setEditTitle(msg.title);
                        setEditMessage(msg.message);
                      }}>
                      編集
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-center mt-8">
        <BackToHome user={user} />
      </div>
    </>
  );
};

export default TeacherSendMessages;
