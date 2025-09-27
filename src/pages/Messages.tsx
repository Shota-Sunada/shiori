import LoadingPage from '../components/LoadingPage';
import { useEffect, useState } from 'react';
import { appFetch } from '../helpers/apiClient';
import type { TeacherMessage } from '../interface/messages';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { useAuth } from '../auth-context';
import { teacherApi } from '../helpers/domainApi';
import type { TeacherDTO } from '../helpers/domainApi';
import { BackToHome } from '../components/MDButton';
import { CacheKeys } from '../helpers/cacheKeys';
import { isOffline } from '../helpers/isOffline';

const Messages = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // メッセージ一覧取得関数を外に出す
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [msgData, teachers] = await Promise.all([appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true, alwaysFetch: true, cacheKey: CacheKeys.messages.list }), teacherApi.list()]);

      // 先生の場合はすべてのメッセージを表示、生徒の場合は既読状態を管理
      if (user?.is_teacher) {
        // 先生の場合はすべてのメッセージをそのまま表示
        setMessages(msgData);
      } else {
        // 生徒の場合は既読状態を管理
        setMessages(
          msgData.map((m) => {
            let readIds: number[] = [];
            if (Array.isArray(m.read_student_ids)) {
              readIds = m.read_student_ids.filter((id): id is number => typeof id === 'number');
            }
            const isRead = user && readIds.includes(Number(user.userId)) ? 1 : typeof m.is_read === 'number' ? m.is_read : 0;
            return {
              ...m,
              is_read: isRead
            };
          })
        );
      }
      setTeachersData(teachers);
    } catch {
      setError('メッセージの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !token) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const [expandedIds, setExpandedIds] = useState<{ [id: number]: boolean }>({});
  const MESSAGE_PREVIEW_LENGTH = 100;

  const handleMarkAsRead = async (id: number) => {
    if (!token || markingId === id) return;
    if (isOffline()) {
      console.log('オフラインなので既読しません。');
      return;
    }
    setMarkingId(id);
    try {
      const result = await appFetch<{ message: string; readAt: string | null }>(`${SERVER_ENDPOINT}/api/messages/${id}/read`, {
        method: 'POST',
        requiresAuth: true
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id
            ? {
                ...m,
                is_read: 1,
                read_at: result.readAt ?? new Date().toISOString()
              }
            : m
        )
      );
    } catch (err) {
      console.error('既読処理に失敗しました:', err);
      alert('既読処理に失敗しました');
    } finally {
      setMarkingId(null);
    }
  };

  if (loading) return <LoadingPage message="読み込み中..." />;
  if (error) return <div className="text-red-600 font-semibold text-center my-4">{error}</div>;

  const handleToggle = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 border-b border-blue-200 pb-2">先生からのメッセージ</h2>
      {messages.length === 0 ? (
        <div className="text-gray-500 text-center py-8">メッセージはありません。</div>
      ) : (
        <ul className="space-y-6">
          {messages.map((msg) => {
            const teacher = teachersData.find((t) => t.id === msg.teacher_id);
            const teacherName = teacher ? `${teacher.surname} ${teacher.forename} 先生` : `ID:${msg.teacher_id}`;
            const isLong = msg.message.length > MESSAGE_PREVIEW_LENGTH;
            const expanded = expandedIds[msg.id];
            return (
              <div key={msg.id}>
                <li className="bg-white rounded-lg shadow-md p-5 border border-blue-100 hover:shadow-lg transition-shadow">
                  <div className="flex flex-row justify-between">
                    <div className="font-bold text-lg text-blue-800 mb-1 truncate" title={msg.title}>
                      {msg.title}
                    </div>
                    <div>
                      {user?.is_teacher ? (
                        // 先生の場合は既読状態のみ表示（編集不可）
                        <span className="inline-flex items-center text-blue-600 text-sm bg-blue-100 px-2 py-1 rounded-full">
                          <span className="mr-1">👨‍🏫</span>
                          先生モード
                        </span>
                      ) : msg.is_read ? (
                        <span className="inline-flex items-center text-green-600 text-sm bg-green-100 px-2 py-1 rounded-full">
                          <span className="mr-1">✔</span>
                          既読{msg.read_at ? `（${new Date(msg.read_at).toLocaleString()}）` : ''}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(msg.id)}
                          disabled={markingId === msg.id}
                          className="text-sm px-3 py-1 rounded-full border border-blue-400 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed shadow">
                          {markingId === msg.id ? '処理中...' : '既読にする'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 relative">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-md">{teacherName}</span>
                      {user?.is_teacher && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          送信先: {msg.target_type === 'group' ? `${msg.target_group_name ?? '未設定'}${typeof msg.recipient_count === 'number' ? `（${msg.recipient_count}人）` : ''}` : '全員'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 sm:text-right">
                      <div>投稿日: {new Date(msg.created_at).toLocaleString()}</div>
                      {msg.updated_at && <div className="text-blue-500">最終編集: {new Date(msg.updated_at).toLocaleString()}</div>}
                      {user?.is_teacher && typeof msg.read_count === 'number' && <div className="text-green-600">既読: {msg.read_count} 件</div>}
                    </div>
                  </div>
                  <div className="text-gray-800 whitespace-pre-line break-words text-base leading-relaxed">
                    {isLong && !expanded ? (
                      <>
                        {msg.message.slice(0, MESSAGE_PREVIEW_LENGTH)}...
                        <button className="ml-2 text-blue-600 underline text-sm hover:text-blue-800" onClick={() => handleToggle(msg.id)}>
                          続きを読む
                        </button>
                      </>
                    ) : (
                      msg.message
                    )}
                  </div>
                </li>
                <div className="flex items-center justify-center">
                  <BackToHome user={user} />
                </div>
              </div>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Messages;
