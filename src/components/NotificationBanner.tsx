import { useEffect, useState } from 'react';
import { appFetch } from '../helpers/apiClient';
import type { TeacherMessage } from '../interface/messages';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { useAuth } from '../auth-context';

// 通知バナー: 最新メッセージがあれば表示
const NotificationBanner = ({ onClick }: { onClick?: () => void }) => {
  const { user, token } = useAuth();
  const [latest, setLatest] = useState<TeacherMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !token) return;

    const fetchLatest = async () => {
      setLoading(true);
      try {
        const data = await appFetch<TeacherMessage[]>(`${SERVER_ENDPOINT}/api/messages`, { requiresAuth: true });
        if (data.length > 0) setLatest(data[0]);
        else setLatest(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLatest();
  }, [user, token]);

  if (loading) return null;
  if (!latest) {
    return <div className="w-full max-w-md p-3 mb-3 text-base text-center text-gray-500 bg-gray-100 rounded-lg">メッセージはありません。</div>;
  }
  return (
    <div className="w-full max-w-md p-3 mb-3 text-base text-center text-white bg-blue-500 rounded-lg cursor-pointer" onClick={onClick}>
      <strong>新しいお知らせ</strong>：{latest.message.length > 30 ? latest.message.slice(0, 30) + '…' : latest.message}
    </div>
  );
};

export default NotificationBanner;
