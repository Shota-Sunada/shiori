import { useEffect, useState } from 'react';
import { appFetch } from '../helpers/apiClient';
import type { TeacherMessage } from '../interface/messages';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { useAuth } from '../auth-context';
import { teacherApi } from '../helpers/domainApi';
import type { TeacherDTO } from '../helpers/domainApi';
import { BackToHome } from '../components/MDButton';

const Messages = () => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [teachersData, setTeachersData] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) return;

    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [msgData, teachers] = await Promise.all([appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true }), teacherApi.list()]);
        setMessages(msgData);
        setTeachersData(teachers);
      } catch {
        setError('メッセージの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user, token]);

  const [expandedIds, setExpandedIds] = useState<{ [id: number]: boolean }>({});
  const MESSAGE_PREVIEW_LENGTH = 100;

  if (loading) return <div className="flex justify-center items-center h-40 text-lg text-gray-500">読み込み中...</div>;
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
                  <div className="font-bold text-lg text-blue-800 mb-1 truncate" title={msg.title}>
                    {msg.title}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900 text-md">{teacherName}</span>
                    <div className="text-xs text-gray-400 ml-2 flex flex-col items-end justify-end">
                      <span>投稿日: {new Date(msg.created_at).toLocaleString()}</span>
                      <span className="ml-2 text-blue-500">{msg.updated_at && <>最終編集: {new Date(msg.updated_at).toLocaleString()}</>}</span>
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
