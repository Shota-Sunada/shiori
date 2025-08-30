import { SERVER_ENDPOINT } from "../app";

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
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
