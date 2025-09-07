import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';

// 画面右下に出るインストールフローティングボタン
// Chromium 系で beforeinstallprompt が発火したときだけ表示し、押下で即 prompt()
// iOS / 非対応ブラウザでは表示しない
export default function FloatingPWAInstallButton() {
  const { supported, deferred, promptInstall, outcome } = usePWAInstallPrompt();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    try {
      const mq = window.matchMedia('(display-mode: standalone)');
      const nav = navigator as Navigator & { standalone?: boolean };
      const update = () => setStandalone(mq.matches || nav.standalone === true);
      update();
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    if (outcome === 'accepted') setDismissed(true);
  }, [outcome]);

  useEffect(() => {
    const handler = () => setDismissed(true);
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, []);

  const onInstallClick = () => {
    if (deferred) {
      promptInstall();
    } else {
      // fallback: インストールページへ遷移
      window.location.assign('/install');
    }
  };

  // 非表示条件
  if (!supported || !deferred) return null; // beforeinstallprompt 捕捉前は出さない
  if (standalone) return null; // 既に PWA モード
  if (dismissed) return null; // 受理/却下後 or ユーザーが閉じた
  if (location.pathname === '/install') return null; // インストール案内ページでは不要

  return (
    <div className="fixed z-50 bottom-6 right-5 flex flex-col items-end gap-2 animate-fade-in">
      <button
        type="button"
        onClick={onInstallClick}
        className="shadow-lg rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        アプリをインストール
      </button>
      <button type="button" aria-label="閉じる" onClick={() => setDismissed(true)} className="text-[10px] text-gray-500 hover:text-gray-700">
        閉じる
      </button>
    </div>
  );
}
