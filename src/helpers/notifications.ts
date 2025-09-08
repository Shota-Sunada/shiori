import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { type AuthUser } from '../auth-context';
import { registerFCMToken } from '../firebase';
import { appFetch } from './apiClient';

interface NotificationPayload {
  userId: string;
  title: string;
  body: string;
  link?: string;
}

interface NotificationResult {
  success: boolean;
  error?: string;
}

const getJwt = (): string | null => {
  try {
    return localStorage.getItem('jwt_token');
  } catch {
    return null;
  }
};

const ensureServiceWorkerAndRegister = (userId: string) => {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => registerFCMToken(userId, registration)).catch((e) => console.error('ServiceWorker ready 取得失敗', e));
};

export const sendNotification = async (payload: NotificationPayload): Promise<NotificationResult> => {
  const token = getJwt();
  if (!token) return { success: false, error: 'JWT token not found' };
  try {
    await appFetch(`${SERVER_ENDPOINT}/send-notification`, {
      method: 'POST',
      requiresAuth: true,
      jsonBody: payload,
      alwaysFetch: true
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to send notification', error);
    return { success: false, error: '通知の送信中にエラーが発生しました。' };
  }
};

/**
 * iOS Safari (PWA) で requestPermission() が resolve しない/極端に遅延する事象への対策。
 * timeout 経過後は 'timeout' を返し、呼び出し元で再確認・ポーリングする。
 */
export const requestPermissionWithTimeout = async (timeoutMs = 3500): Promise<NotificationPermission | 'timeout'> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;

  return await new Promise<NotificationPermission | 'timeout'>((resolve) => {
    let settled = false;
    const start = performance.now?.() ?? Date.now();
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        console.warn('[notifications] requestPermission timeout', { timeoutMs });
        resolve('timeout');
      }
    }, timeoutMs);
    try {
      Notification.requestPermission()
        .then((p) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          const elapsed = (performance.now?.() ?? Date.now()) - start;
          console.info('[notifications] permission resolved', { permission: p, elapsed });
          resolve(p);
        })
        .catch((e) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          console.error('[notifications] requestPermission error', e);
          resolve('denied');
        });
    } catch (e) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      console.error('[notifications] requestPermission sync throw', e);
      resolve('denied');
    }
  });
};

const requestPermissionIfNeeded = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'default') {
    const result = await requestPermissionWithTimeout();
    if (result === 'timeout') {
      // timeout後、Permission API が更新されている可能性があるため現状値を返す
      return Notification.permission;
    }
    return result;
  }
  return Notification.permission;
};

export const handleEnableNotifications = async (user: AuthUser | null) => {
  if (!('Notification' in window)) {
    alert('このブラウザは通知をサポートしていません。');
    return;
  }
  const permission = await requestPermissionIfNeeded();
  if (permission === 'granted') {
    if (user?.userId) {
      ensureServiceWorkerAndRegister(user.userId);
      alert('通知が有効になりました。');
    } else {
      alert('ログイン後に再度お試しください。');
    }
  } else if (permission === 'denied') {
    alert('通知が拒否されています。ブラウザの設定を確認してください。');
  }
};

export const registerOrRequestPermission = async (user: AuthUser | null) => {
  if (!('Notification' in window)) {
    console.log('このブラウザは通知をサポートしていません。');
    return;
  }
  const permission = await requestPermissionIfNeeded();
  if (permission === 'granted') {
    if (user?.userId) {
      ensureServiceWorkerAndRegister(user.userId);
    } else {
      console.log('ユーザーがログインしていません。');
    }
  } else if (permission === 'denied') {
    console.log('通知が許可されていません。');
  }
};
