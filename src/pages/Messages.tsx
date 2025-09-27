import { useCallback, useEffect, useState } from 'react';
import { EMOJI_LIST } from '../helpers/emoji';
import type { TeacherMessage } from '../interface/messages';
import { useAuth } from '../auth-context';
import { teacherApi, messagesApi } from '../helpers/domainApi';
import type { TeacherDTO } from '../helpers/domainApi';
import MDButton, { BackToHome } from '../components/MDButton';
import { isOffline } from '../helpers/isOffline';

const Messages = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // メッセージ一覧取得関数を外に出す
  const fetchAll = useCallback(async () => {
    setError(null);
    setError(null);
    try {
      const [msgData, teachers] = await Promise.all([messagesApi.list(), teacherApi.list()]);
      // my_emoji_idをクライアント側で必ずセット
      const userId = user?.userId ? Number(user.userId) : undefined;
      const withMyEmoji = msgData.map((m) => {
        let my_emoji_id = m.my_emoji_id;
        if (userId && Array.isArray(m.read_reactions)) {
          const found = m.read_reactions.find((r) => r.user_id === userId);
          my_emoji_id = found ? found.emoji_id : null;
        }
        return { ...m, my_emoji_id };
      });
      setMessages(withMyEmoji);
      setTeachersData(teachers);
    } catch {
      setError('メッセージの取得に失敗しました');
    }
  }, [user?.userId]);

  useEffect(() => {
    if (!user || !token) return;
    fetchAll();
  }, [user, token, fetchAll]);

  const [expandedIds, setExpandedIds] = useState<{ [id: number]: boolean }>({});
  const MESSAGE_PREVIEW_LENGTH = 100;

  // emoji.tsからEMOJI_LISTを利用

  const handleMarkAsRead = async (id: number, emoji_id: number) => {
    if (!token || markingId === id) return;
    if (isOffline()) {
      console.log('オフラインなので既読しません。');
      return;
    }
    setMarkingId(id);
    // 楽観的UI: ローカル状態を即時更新
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              my_emoji_id: emoji_id,
              emoji_counts: {
                ...m.emoji_counts,
                [emoji_id]: (m.emoji_counts?.[emoji_id] ?? 0) + 1
              }
            }
          : m
      )
    );
    try {
      await messagesApi.markAsRead(id, emoji_id);
      // サーバー最新取得
      fetchAll();
    } catch (err) {
      console.error('既読処理に失敗しました:', err);
      alert('既読処理に失敗しました');
    } finally {
      setMarkingId(null);
    }
  };

  if (error) return <div className="text-red-600 font-semibold text-center my-4">{error}</div>;

  const handleToggle = (id: number) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-blue-700 border-b border-blue-200 pb-2">先生からのメッセージ</h2>
      {messages.length === 0 ? (
        <>
          <div className="text-gray-500 text-center py-8">メッセージはありません。</div>
          <MDButton text="メッセージを送信" arrowRight link="/teacher/messages" />
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center">
            <MDButton text="メッセージを送信" arrowRight link="/teacher/messages" />
          </div>

          <ul className="space-y-10">
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
                        {msg.my_emoji_id ? (
                          <span className="inline-flex items-center text-green-600 text-sm bg-green-100 px-2 py-1 rounded-full">
                            <span className="mr-1 text-xl">{EMOJI_LIST.find((e) => e.id === msg.my_emoji_id)?.emoji ?? EMOJI_LIST[0].emoji}</span>
                            既読
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            {EMOJI_LIST.map((e) => (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => handleMarkAsRead(msg.id, e.id)}
                                disabled={markingId === msg.id}
                                className="text-xl px-3 py-1 rounded-full border border-blue-400 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
                                aria-label={`「${e.emoji}」で既読にする`}>
                                {markingId === msg.id ? '⏳' : e.emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2 relative">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900 text-md">{teacherName}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          送信先: {msg.target_type === 'group' ? `${msg.target_group_name ?? '未設定'}${typeof msg.recipient_count === 'number' ? `（${msg.recipient_count}人）` : ''}` : '全員'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 sm:text-right">
                        <div>投稿日: {new Date(msg.created_at).toLocaleString()}</div>
                        {msg.updated_at ? <div className="text-blue-500">最終編集: {new Date(msg.updated_at).toLocaleString()}</div> : <></>}
                        {user?.is_teacher ? typeof msg.read_count === 'number' && <div className="text-green-600">既読: {msg.read_count} 件</div> : <></>}
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
                  {/* 既読数をemojiごとに表示 */}
                  {msg.emoji_counts && (
                    <div className="flex gap-4 mt-2 mb-2">
                      {EMOJI_LIST.map((e) => (
                        <div key={e.id} className="flex items-center gap-1">
                          <span className="text-xl select-none">{e.emoji}</span>
                          <span className="text-sm text-gray-700 font-semibold">{msg.emoji_counts?.[e.id] ?? 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-center">
                    <BackToHome user={user} />
                  </div>
                </div>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default Messages;
