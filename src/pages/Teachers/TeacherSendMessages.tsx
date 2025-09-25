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

      <div className="flex items-center justify-center">
        <BackToHome user={user} />
      </div>
    </>
  );
};

export default TeacherSendMessages;
