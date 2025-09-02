import { SERVER_ENDPOINT } from '../App';
import { type AuthUser } from '../auth-context';
import { registerFCMToken } from '../firebase';

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
}

export const sendNotification = async (payload: NotificationPayload): Promise<{ success: boolean; error?: string }> => {
  try {
    const res = await fetch(`${SERVER_ENDPOINT}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      return { success: true };
    } else {
      const errorData = await res.json();
      return { success: false, error: errorData.error || '不明なエラー' };
    }
  } catch (error) {
    console.error('Failed to send notification', error);
    return { success: false, error: '通知の送信中にエラーが発生しました。' };
  }
};

export const handleEnableNotifications = async (user: AuthUser | null) => {
  if (!('Notification' in window)) {
    alert('このブラウザは通知をサポートしていません。');
    return;
  }

  const permission = await Notification.requestPermission();

  if (permission === 'granted') {
    alert('通知が有効になりました。');
    if (user && user.userId) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registerFCMToken(user.userId, registration);
        });
      }
    } else {
      alert('ログイン後に再度お試しください。');
    }
  } else {
    alert('通知が拒否されました。');
  }
};
