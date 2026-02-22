// appFetchCache_のキャッシュ一覧を取得
// ttlMs: キャッシュ有効期間（ミリ秒）。0または未定義なら無期限。
function getAppFetchCacheList() {
  const prefix = 'appFetchCache_';
  const now = Date.now();
  const result: Array<{
    key: string;
    remainMs: number | null;
    at: number;
    ttlMs: number | null;
    expireAt: number | null;
  }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) {
      try {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (typeof parsed.at === 'number') {
          const ttlMs = typeof parsed.ttlMs === 'number' ? parsed.ttlMs : 0;
          let remainMs: number | null = null;
          let expireAt: number | null = null;
          if (ttlMs > 0) {
            remainMs = Math.max(ttlMs - (now - parsed.at), 0);
            expireAt = parsed.at + ttlMs;
          }
          result.push({ key: k.slice(prefix.length), remainMs, at: parsed.at, ttlMs: ttlMs > 0 ? ttlMs : null, expireAt });
        }
      } catch {
        //
      }
    }
  }
  return result;
}
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
      if (isOffline()) {
        console.log("オフラインなのでFCMトークンの送信を行いません。")
        return;}

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
import { BackToHome } from '../components/MDButton';
import { useAuth } from '../auth-context';
import { isOffline } from '../helpers/isOffline';

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
  const { user } = useAuth();
  const env = parseClientEnvironment();
  const osIcon = OS_ICONS[env.os] || genericIcon;
  const browserIcon = BROWSER_ICONS[env.browser] || genericIcon;

  // キャッシュ一覧取得
  const [cacheList, setCacheList] = useState<
    Array<{
      key: string;
      remainMs: number | null;
      at: number;
      ttlMs: number | null;
      expireAt: number | null;
    }>
  >([]);

  useEffect(() => {
    setCacheList(getAppFetchCacheList());
    // localStorage変更時にも反映したい場合はstorageイベントを利用
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('appFetchCache_')) {
        setCacheList(getAppFetchCacheList());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="w-full max-w-3xl mx-auto py-10 px-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">動作環境表示</h1>
        <p>この画面は、問題が発生したときなどに使用します。</p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <InfoCard icon={osIcon} title="Operating System" label={`${env.os} ${env.osVersion}`} />
        <InfoCard icon={browserIcon} title="Browser" label={`${env.browser} ${env.browserVersion}`} />
        <FcmTokenStatus />
      </div>
      <div className="mt-4">
        <div className="bg-white/90 p-4 rounded shadow-sm">
          <h2 className="text-lg font-semibold mb-2">キャッシュ一覧</h2>
          {cacheList.length === 0 ? (
            <div className="text-gray-500 text-sm">キャッシュはありません</div>
          ) : (
            <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">キー</th>
                  <th className="px-2 py-1 text-left">有効期限</th>
                  <th className="px-2 py-1 text-left">保存時刻</th>
                </tr>
              </thead>
              <tbody>
                {cacheList.map((c) => {
                  let expireStr = '';
                  if (c.ttlMs === null) {
                    expireStr = '無期限';
                  } else if (c.remainMs !== null && c.remainMs === 0) {
                    expireStr = '期限切れ';
                  } else if (c.expireAt !== null) {
                    // TTLをHH:MM:SS表記に
                    let ttlStr = '';
                    if (c.ttlMs) {
                      const totalSec = Math.floor(c.ttlMs / 1000);
                      const h = Math.floor(totalSec / 3600);
                      const m = Math.floor((totalSec % 3600) / 60);
                      const s = totalSec % 60;
                      ttlStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                    }
                    expireStr = new Date(c.expireAt).toLocaleString() + `（TTL: ${ttlStr}）`;
                  } else {
                    expireStr = '-';
                  }
                  const atStr = new Date(c.at).toLocaleString();
                  return (
                    <tr key={c.key} className="border-t border-gray-100">
                      <td className="px-2 py-1 font-mono break-all">{c.key}</td>
                      <td className="px-2 py-1">{expireStr}</td>
                      <td className="px-2 py-1">{atStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center">
        <BackToHome user={user} />
      </div>
    </div>
  );
};

export default EnvDebug;
