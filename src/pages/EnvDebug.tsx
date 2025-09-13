import React, { useEffect, useState } from 'react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../firebase';
import { appFetch } from '../helpers/apiClient';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
function FcmTokenStatus() {
  const [status, setStatus] = useState<'loading' | 'match' | 'mismatch' | 'error' | 'not-registered'>('loading');
  const [serverToken, setServerToken] = useState<string | null>(null);
  const [clientToken, setClientToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await appFetch<{ token: string | null }>(`${SERVER_ENDPOINT}/api/fcm-token/me/fcm-token`, { requiresAuth: true, alwaysFetch: true });
        setServerToken(data.token);
        let cToken: string | null = null;
        try {
          cToken = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY });
        } catch {
          // 権限未許可など
        }
        setClientToken(cToken);
        if (!data.token && !cToken) {
          setStatus('not-registered');
        } else if (data.token === cToken) {
          setStatus('match');
        } else {
          setStatus('mismatch');
        }
      } catch {
        setStatus('error');
      }
    })();
  }, []);

  let message = '';
  let color = '';
  switch (status) {
    case 'loading':
      message = 'FCMトークン確認中...';
      color = 'text-gray-500';
      break;
    case 'match':
      message = 'FCMトークンは一致しています。';
      color = 'text-green-600';
      break;
    case 'mismatch':
      message = 'FCMトークンがサーバーと端末で異なります。';
      color = 'text-yellow-700';
      break;
    case 'not-registered':
      message = 'FCMトークンが登録されていません。';
      color = 'text-gray-500';
      break;
    case 'error':
      message = 'FCMトークンの取得に失敗しました。';
      color = 'text-red-600';
      break;
  }

  return (
    <div className={`flex flex-col gap-1 bg-white/90 p-4 rounded shadow-sm ${color}`}>
      <div className="font-medium text-lg">FCMトークン状態</div>
      <div>{message}</div>
      <div className="text-xs break-all text-gray-400">サーバー: {serverToken || 'なし'}</div>
      <div className="text-xs break-all text-gray-400">端末: {clientToken || 'なし'}</div>
    </div>
  );
}
import { parseClientEnvironment } from '../helpers/pwaSupport';
import safariIcon from '@browser-logos/safari-ios/safari-ios.svg';
import chromeIcon from '@browser-logos/chrome/chrome.svg';
import edgeIcon from '@browser-logos/edge/edge.svg';
import firefoxIcon from '@browser-logos/firefox/firefox.svg';
import samsungIcon from '@browser-logos/samsung-internet/samsung-internet.svg';
import vivaldiIcon from '@browser-logos/vivaldi/vivaldi.svg';
import braveIcon from '@browser-logos/brave/brave.svg';
import genericIcon from '@browser-logos/web/web.svg';
import operaIcon from '@browser-logos/opera/opera.svg';
import winIcon from '@egoistdeveloper/operating-system-logos/src/32x32/WIN.png';
import andIcon from '@egoistdeveloper/operating-system-logos/src/32x32/AND.png';
import iosIcon from '@egoistdeveloper/operating-system-logos/src/32x32/IOS.png';
import macIcon from '@egoistdeveloper/operating-system-logos/src/32x32/MAC.png';
import linIcon from '@egoistdeveloper/operating-system-logos/src/32x32/LIN.png';

const BROWSER_ICONS: Record<string, string> = {
  Safari: safariIcon,
  Chrome: chromeIcon,
  Edge: edgeIcon,
  Firefox: firefoxIcon,
  Samsung: samsungIcon,
  Vivaldi: vivaldiIcon,
  Brave: braveIcon,
  Opera: operaIcon
};
const OS_ICONS: Record<string, string> = {
  Windows: winIcon,
  Android: andIcon,
  iOS: iosIcon,
  macOS: macIcon,
  Linux: linIcon
};

function InfoCard({ icon, title, label }: { icon: string; title: string; label: string }) {
  return (
    <div className="flex items-center gap-4 bg-white/90 p-4 rounded shadow-sm">
      <img src={icon || genericIcon} alt={title} className="w-10 h-10 shrink-0" />
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="font-medium text-lg">{label}</div>
      </div>
    </div>
  );
}

const EnvDebug: React.FC = () => {
  const env = parseClientEnvironment();
  const osIcon = OS_ICONS[env.os] || genericIcon;
  const browserIcon = BROWSER_ICONS[env.browser] || genericIcon;

  return (
    <div className="w-full max-w-3xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-4">動作環境表示</h1>

      <div className="grid grid-cols-1 gap-4">
        <InfoCard icon={osIcon} title="Operating System" label={`${env.os} ${env.osVersion}`} />
        <InfoCard icon={browserIcon} title="Browser" label={`${env.browser} ${env.browserVersion}`} />
        <FcmTokenStatus />
      </div>
    </div>
  );
};

export default EnvDebug;
