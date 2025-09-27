import { useState, useEffect, useCallback } from 'react';
import { appFetch } from '../../helpers/apiClient';
import { SERVER_ENDPOINT } from '../../config/serverEndpoint';
import { useAuth } from '../../auth-context';
import { teacherApi, rollCallApi, studentApi, type StudentDTO } from '../../helpers/domainApi';
import type { TeacherMessage } from '../../interface/messages';
import { BackToHome } from '../../components/MDButton';
import Modal from '../../components/Modal';
import StudentPresetSelector, { type RollCallGroup } from '../../components/StudentPresetSelector';
import { isOffline } from '../../helpers/isOffline';
import { CacheKeys } from '../../helpers/cacheKeys';

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
  const [rollCallGroups, setRollCallGroups] = useState<RollCallGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [targetPreset, setTargetPreset] = useState<string>('default');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  // 削除確認用
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // 既読者モーダル用
  const [showReadModal, setShowReadModal] = useState(false);
  const [readModalMessage, setReadModalMessage] = useState<TeacherMessage | null>(null);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // 生徒一覧取得（初回のみ）
  useEffect(() => {
    if (!token) return;
    setStudentsLoading(true);
    studentApi
      .list({ alwaysFetch: false })
      .then((list) => setStudents(list))
      .catch(() => setStudents([]))
      .finally(() => setStudentsLoading(false));
  }, [token]);
  // メッセージ削除処理
  const handleDelete = async (id: number) => {
    if (!token) return;
    if (isOffline()) {
      console.log('オフラインなので処理をスキップします。');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await appFetch(`${SERVER_ENDPOINT}/api/messages/${id}`, {
        method: 'DELETE',
        requiresAuth: true
      });
      setMyMessages((prev) => prev.filter((m) => m.id !== id));
      setDeletingId(null);
    } catch {
      setDeleteError('削除に失敗しました');
    } finally {
      setDeleteLoading(false);
    }
  };

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

  useEffect(() => {
    const fetchGroups = async () => {
      if (!token) return;
      setLoadingGroups(true);
      setGroupError(null);
      try {
        const groups = await rollCallApi.groups();
        setRollCallGroups(groups as RollCallGroup[]);
      } catch (err) {
        console.error('点呼グループの取得に失敗しました:', err);
        setGroupError('送信先リストの取得に失敗しました');
        setRollCallGroups([]);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, [token]);

  // 先生の過去メッセージ取得
  const fetchMyMessages = useCallback(async () => {
    if (!teacherId || !token) return;
    try {
      const all = await appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true, alwaysFetch: true, cacheKey: CacheKeys.messages.list });
      setMyMessages(all.filter((m) => m.teacher_id === teacherId));
    } catch {
      setMyMessages([]);
    }
  }, [teacherId, token]);

  useEffect(() => {
    fetchMyMessages();
  }, [fetchMyMessages]);

  const handleSend = async (e: React.FormEvent) => {
    if (!user || !token) return;
    if (!teacherId) {
      setError('先生情報の取得に失敗しました');
      return;
    }

    e.preventDefault();

    if (targetPreset === 'default') {
      alert('送信先を指定してください');
      return;
    }

    setSending(true);
    setSuccess(null);
    setError(null);
    try {
      const trimmedTitle = title.trim();
      const trimmedMessage = message.trim();
      const targetType = targetPreset === 'all' || targetPreset === 'default' ? 'all' : 'group';
      const payload: Record<string, unknown> = {
        teacherId,
        title: trimmedTitle,
        message: trimmedMessage,
        targetType
      };
      if (targetType === 'group') {
        payload.targetGroupName = targetPreset;
      }

      const res = await appFetch<Partial<TeacherMessage>>(`${SERVER_ENDPOINT}/api/messages`, {
        method: 'POST',
        jsonBody: payload,
        requiresAuth: true
      });

      if (!res) {
        setError('送信に失敗しました');
        return;
      }

      setSuccess('メッセージを送信しました');
      setTitle('');
      setMessage('');
      setTargetPreset('default');
      await fetchMyMessages(); // 送信後に即時更新
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
      await appFetch<{ message: string; data: TeacherMessage }>(`${SERVER_ENDPOINT}/api/messages/${id}`, {
        method: 'PUT',
        requiresAuth: true,
        jsonBody: { title: editTitle, message: editMessage },
        cacheKey: CacheKeys.messages.id(id)
      });
      setEditingId(null);
      setEditTitle('');
      setEditMessage('');
      setEditError(null);
      await fetchMyMessages(); // 編集後に即時更新
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
            <span className="block text-gray-700 font-semibold mb-1 text-lg">送信先</span>
            <StudentPresetSelector value={targetPreset} onChange={setTargetPreset} rollCallGroups={rollCallGroups} disabled={loadingGroups || sending} />
            {groupError && <div className="text-sm text-red-500 mt-1">{groupError}</div>}
            <p className="text-sm text-gray-500 mt-1">対象を選択してください。未選択の場合は全員に送信されます。</p>
          </div>
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
            disabled={sending || !title.trim() || !message.trim() || title.length > TITLE_MAX_LENGTH || loadingGroups || targetPreset === 'default'}
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
                    <div className="text-xs text-gray-500 mb-1">
                      送信先: {msg.target_type === 'group' ? `${msg.target_group_name ?? '未設定'}${typeof msg.recipient_count === 'number' ? `（${msg.recipient_count}人）` : ''}` : '全員'}
                    </div>
                    <div className="text-xs text-gray-400 mb-1">
                      投稿日: {new Date(msg.created_at).toLocaleString()}
                      {msg.updated_at && <span className="ml-2 text-blue-500">(最終編集: {new Date(msg.updated_at).toLocaleString()})</span>}
                    </div>
                    <div className="text-xs text-gray-500 mb-1 flex flex-wrap items-center gap-4">
                      {/* 絵文字ごとの既読数 */}
                      {msg.emoji_counts && (
                        <>
                          <span>既読:</span>
                          {[
                            { id: 1, emoji: '👍️' },
                            { id: 2, emoji: '❤' },
                            { id: 3, emoji: '☺' }
                          ].map((e) => (
                            <span key={e.id} className="inline-flex items-center gap-1">
                              <span className="text-xl">{e.emoji}</span>
                              <span>{msg.emoji_counts?.[e.id] ?? 0}</span>
                            </span>
                          ))}
                        </>
                      )}
                      <button
                        type="button"
                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold hover:bg-blue-200 transition text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => {
                          setReadModalMessage(msg);
                          setShowReadModal(true);
                        }}>
                        既読者一覧
                      </button>
                    </div>
                    <div className="flex gap-2 items-center mt-2">
                      <button
                        className="px-3 py-1 rounded bg-blue-500 text-white font-semibold hover:bg-blue-700 transition text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        onClick={() => {
                          setEditingId(msg.id);
                          setEditTitle(msg.title);
                          setEditMessage(msg.message);
                        }}>
                        編集
                      </button>
                      <button
                        className="px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-700 transition text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        onClick={() => setDeletingId(msg.id)}
                        disabled={deleteLoading}>
                        削除
                      </button>
                    </div>
                    {/* 削除確認ダイアログ */}
                    {deletingId === msg.id && (
                      <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-lg p-6 max-w-xs w-full border border-red-200">
                          <div className="text-lg font-bold text-red-600 mb-3">本当に削除しますか？</div>
                          <div className="text-gray-700 mb-4">
                            このメッセージ「{msg.title}」を削除してもよろしいですか？
                            <br />
                            この操作は元に戻せません。
                          </div>
                          <div className="flex gap-3 justify-end">
                            <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700" onClick={() => handleDelete(msg.id)} disabled={deleteLoading}>
                              {deleteLoading ? '削除中...' : '削除する'}
                            </button>
                            <button
                              className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                              onClick={() => {
                                setDeletingId(null);
                                setDeleteError(null);
                              }}
                              disabled={deleteLoading}>
                              キャンセル
                            </button>
                          </div>
                          {deleteError && <div className="text-red-500 text-sm mt-2">{deleteError}</div>}
                        </div>
                      </div>
                    )}
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

      {/* 既読者一覧モーダル */}
      <Modal isOpen={showReadModal && !!readModalMessage} onClose={() => setShowReadModal(false)} overlayClassName="backdrop-blur-sm" className="max-w-xs w-full p-6">
        <div className="text-lg font-bold text-blue-700 mb-3">既読者一覧</div>
        {studentsLoading ? (
          <div className="text-gray-500">読込中...</div>
        ) : (
          <ul className="max-h-60 overflow-y-auto text-sm">
            {(() => {
              const reactions = readModalMessage?.read_reactions ?? [];
              if (!reactions.length) return <li className="text-gray-400">既読者なし</li>;
              // 学籍番号→生徒情報
              return reactions.map((r) => {
                const s = students.find((x) => x.gakuseki === r.user_id);
                return (
                  <li key={r.user_id} className="flex items-center gap-2">
                    <span className="text-xl">{r.emoji_id === 1 ? '👍️' : r.emoji_id === 2 ? '❤' : r.emoji_id === 3 ? '☺' : ''}</span>
                    {s ? `${s.surname} ${s.forename} (5-${s.class})` : `ID:${r.user_id}`}
                  </li>
                );
              });
            })()}
          </ul>
        )}
      </Modal>
    </>
  );
};

export default TeacherSendMessages;
