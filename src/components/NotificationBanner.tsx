import { useEffect, useState } from 'react';
import { appFetch } from '../helpers/apiClient';
import type { TeacherMessage } from '../interface/messages';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { useAuth } from '../auth-context';
import { CacheKeys } from '../helpers/cacheKeys';

// 通知バナー: 未読件数と最新メッセージを表示
const NotificationBanner = ({ onClick }: { onClick?: () => void }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const data = await appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true, cacheKey: CacheKeys.messages.list });
        setMessages(data);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user, token]);

  if (loading) return null;
  if (!messages.length) {
    return <div className="w-full max-w-md p-3 mb-3 text-base text-center text-gray-500 bg-gray-100 rounded-lg shadow-sm">メッセージはありません。</div>;
  }

  // userIdがread_student_idsに含まれていれば既読扱い
  const unreadMessages = messages.filter((m) => {
    if (!user || !m.read_student_ids) return m.is_read !== 1;
    const readIds = Array.isArray(m.read_student_ids) ? m.read_student_ids.filter((id): id is number => typeof id === 'number') : [];
    return !readIds.includes(Number(user.userId));
  });
  const unreadCount = unreadMessages.length;

  if (unreadCount === 0) {
    return (
      <div className="w-full max-w-md p-3 mb-3 text-base text-center text-blue-700 bg-blue-100 rounded-lg shadow-sm font-semibold" onClick={onClick}>
        先生からのメッセージを確認
      </div>
    );
  }

  return (
    <div
      className="w-full max-w-md p-3 mb-3 text-base text-center text-white bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg shadow-md cursor-pointer flex flex-col items-center gap-1"
      onClick={onClick}>
      <div className="flex flex-col items-center gap-2 justify-center">
        <span className="inline-block bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full animate-bounce">未読{unreadCount}件</span>
        <span className="font-semibold">新しいメッセージがあります！</span>
      </div>
    </div>
  );
};

export default NotificationBanner;
