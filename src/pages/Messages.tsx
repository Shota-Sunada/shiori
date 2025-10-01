import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMOJI_LIST } from '../helpers/emoji';
import Modal from '../components/Modal';
import type { TeacherMessage } from '../interface/messages';
import { useAuth } from '../auth-context';
import { teacherApi, messagesApi, studentApi, type TeacherDTO, type StudentDTO } from '../helpers/domainApi';
import MDButton, { BackToHome } from '../components/MDButton';
import { isOffline } from '../helpers/isOffline';
import { pad2 } from '../helpers/pad2';

type ReadReaction = { user_id: number; emoji_id: number };

// 既読絵文字ごとの既読者一覧を表示するコンポーネント
type EmojiReadStatusProps = {
  emojiCounts: Record<number, number>;
  readReactions?: ReadReaction[];
  teachers: Pick<TeacherDTO, 'id' | 'surname' | 'forename'>[];
  students: StudentDTO[];
  isLoadingStudents: boolean;
};

const EmojiReadStatus = ({ emojiCounts, readReactions, teachers, students, isLoadingStudents }: EmojiReadStatusProps) => {
  const [showModal, setShowModal] = useState(false);

  const { groupedEmojis, hasReactions, studentIndex, teacherIndex } = useMemo(() => {
    const reactionsList = readReactions ?? [];
    const groups = EMOJI_LIST.map((emoji) => ({
      emoji,
      list: [] as ReadReaction[]
    }));
    const groupMap = new Map<number, ReadReaction[]>();
    groups.forEach((g) => {
      groupMap.set(g.emoji.id, g.list);
    });
    reactionsList.forEach((reaction) => {
      const targetList = groupMap.get(reaction.emoji_id);
      if (targetList) targetList.push(reaction);
    });
    const studentMap = new Map<number, StudentDTO>();
    students.forEach((student) => {
      studentMap.set(Number(student.gakuseki), student);
    });
    const teacherMap = new Map<number, Pick<TeacherDTO, 'id' | 'surname' | 'forename'>>();
    teachers.forEach((teacher) => {
      teacherMap.set(teacher.id, teacher);
    });
    return {
      groupedEmojis: groups,
      hasReactions: reactionsList.length > 0,
      studentIndex: studentMap,
      teacherIndex: teacherMap
    };
  }, [readReactions, students, teachers]);

  return (
    <>
      <div
        className="flex flex-col items-center gap-4 mt-2 mb-2 cursor-pointer bg-blue-200/80 hover:bg-blue-300/80 rounded-lg transition-colors relative p-3 shadow-sm border border-blue-300"
        onClick={() => setShowModal(true)}
        tabIndex={0}
        role="button"
        aria-label="既読者一覧を表示"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setShowModal(true);
        }}>
        <div className='flex flex-row gap-3'>
          {EMOJI_LIST.map((e) => {
            const count = emojiCounts?.[e.id] ?? 0;
            return (
              <div key={e.id} className="flex flex-row items-center justify-center gap-1">
                <span className="text-2xl select-none">{e.emoji}</span>
                <span className="text-gray-700 font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
        <p>押すと既読者を確認できます</p>
      </div>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} overlayClassName="backdrop-blur-sm" className="max-w-xs w-full p-6">
        <div className="text-lg font-bold text-blue-700 mb-3">既読者一覧</div>
        <div className="max-h-80 overflow-y-auto pr-2">
          {isLoadingStudents ? (
            <div className="text-gray-500">読込中...</div>
          ) : !hasReactions ? (
            <div className="text-gray-400">既読者なし</div>
          ) : (
            <div className="space-y-4">
              {groupedEmojis.map(({ emoji, list }) => (
                <div key={emoji.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{emoji.emoji}</span>
                    <span className="text-xs text-gray-500">{list.length}人</span>
                  </div>
                  {list.length === 0 ? (
                    <div className="text-gray-300 text-xs ml-6">該当者なし</div>
                  ) : (
                    <ul className="ml-4 space-y-1">
                      {list.map((reaction) => {
                        const student = studentIndex.get(reaction.user_id);
                        const teacher = teacherIndex.get(reaction.user_id);
                        return (
                          <li key={`${reaction.user_id}-${reaction.emoji_id}`} className="flex items-center gap-2">
                            {student ? (
                              <span className="text-gray-700">{`5${student.class}${pad2(student.number)} ${student.surname} ${student.forename}`}</span>
                            ) : teacher ? (
                              <span className="text-blue-700 font-bold">{`${teacher.surname} ${teacher.forename}（先生）`}</span>
                            ) : (
                              <span className="text-gray-400">ID:{reaction.user_id}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-center mt-3">外の部分を押すと閉じます</p>
      </Modal>
    </>
  );
};

const Messages = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherDTO[]>([]);
  const [studentsData, setStudentsData] = useState<StudentDTO[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<number | null>(null);

  // メッセージ一覧取得関数を外に出す
  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [msgData, teachers] = await Promise.all([messagesApi.list(), teacherApi.list()]);
      const userId = user?.userId ? Number(user.userId) : undefined;
      // 自分宛以外のメッセージを除外
      const filtered = msgData.filter((m) => {
        if (!userId) return false;
        if (m.target_type === 'all') return true;
        if (m.target_type === 'group' && Array.isArray(m.read_reactions)) {
          // グループ宛はread_reactionsに自分が含まれていれば受信対象
          return m.read_reactions.some((r) => r.user_id === userId);
        }
        if (m.target_type === 'custom' && Array.isArray(m.read_reactions)) {
          // customも同様
          return m.read_reactions.some((r) => r.user_id === userId);
        }
        return false;
      });
      // my_emoji_idをクライアント側で必ずセット
      const withMyEmoji = filtered.map((m) => {
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

  useEffect(() => {
    if (!token || !user?.is_teacher) return;
    setStudentsLoading(true);
    studentApi
      .list({ alwaysFetch: false })
      .then((list) => setStudentsData(list))
      .catch(() => setStudentsData([]))
      .finally(() => setStudentsLoading(false));
  }, [token, user?.is_teacher]);

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
    <div className="max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-lg border border-blue-100 mt-10 flex flex-col items-center">
      <h2 className="text-3xl font-extrabold mb-8 text-blue-700 border-b-2 border-blue-200 pb-3 tracking-wide text-center">先生からのメッセージ</h2>
      {messages.length === 0 ? (
        <>
          <div className="text-gray-500 text-center py-8">メッセージはありません。</div>
          {user?.is_teacher ? <MDButton text="メッセージを送信" arrowRight link="/teacher/messages" /> : <></>}
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center mb-6">{user?.is_teacher ? <MDButton text="メッセージを送信" arrowRight link="/teacher/messages" /> : <></>}</div>
          <ul className="space-y-8 w-full">
            {messages.map((msg) => {
              const teacher = teachersData.find((t) => t.id === msg.teacher_id);
              const teacherName = teacher ? `${teacher.surname} ${teacher.forename} 先生` : `ID:${msg.teacher_id}`;
              const isLong = msg.message.length > MESSAGE_PREVIEW_LENGTH;
              const expanded = expandedIds[msg.id];
              return (
                <li key={msg.id} className="bg-blue-50 rounded-2xl shadow-md p-6 border border-blue-100 hover:shadow-xl transition flex flex-col">
                  <div className="flex flex-row justify-between items-center mb-2">
                    <div className="font-bold text-xl text-blue-800 truncate" title={msg.title}>
                      {msg.title}
                    </div>
                    <div>
                      {msg.my_emoji_id ? (
                        <span className="inline-flex items-center text-green-600 text-sm bg-green-100 px-2 py-1 rounded-full">
                          <span className="mr-1 text-xl">{EMOJI_LIST.find((e) => e.id === msg.my_emoji_id)?.emoji ?? EMOJI_LIST[0].emoji}</span>
                          既読
                        </span>
                      ) : (
                        <div className="flex gap-2 bg-blue-100/60 rounded-lg px-2 py-1 transition-colors hover:bg-blue-200/70">
                          {EMOJI_LIST.map((e) => (
                            <button
                              key={e.id}
                              type="button"
                              onClick={() => handleMarkAsRead(msg.id, e.id)}
                              disabled={markingId === msg.id}
                              className="text-xl px-3 py-1 rounded-full border border-blue-400 text-blue-600 bg-white hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                      <span className="font-semibold text-gray-900 text-md">送信者: {teacherName}</span>
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
                  <div className="text-gray-800 whitespace-pre-line break-words text-base leading-relaxed mb-2">
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
                  {/* 既読数をemojiごとに表示・クリックで既読者一覧 */}
                  {msg.emoji_counts && (
                    <EmojiReadStatus emojiCounts={msg.emoji_counts} readReactions={msg.read_reactions} teachers={teachersData} students={studentsData} isLoadingStudents={studentsLoading} />
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <div className="mt-8 w-full flex justify-center">
        <BackToHome user={user} />
      </div>
    </div>
  );
};

export default Messages;
