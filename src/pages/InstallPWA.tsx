import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MDButton from '../components/MDButton';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';
import { detectPWAPushSupport, parseClientEnvironment } from '../helpers/pwaSupport';
import safariIcon from '@browser-logos/safari-ios/safari-ios.svg';
import chromeIcon from '@browser-logos/chrome/chrome.svg';
import edgeIcon from '@browser-logos/edge/edge.svg';
import firefoxIcon from '@browser-logos/firefox/firefox.svg';
import samsungIcon from '@browser-logos/samsung-internet/samsung-internet.svg';
import vivaldiIcon from '@browser-logos/vivaldi/vivaldi.svg';
import braveIcon from '@browser-logos/brave/brave.svg';
import genericIcon from '@browser-logos/web/web.svg';
import operaIcon from '@browser-logos/opera/opera.svg';

// 判定: 既に PWA モード (standalone / display-mode: standalone)
function useIsStandalone() {
  return useMemo(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    const nav = navigator as Navigator & { standalone?: boolean };
    return mq.matches || nav.standalone === true;
  }, []);
}

const InstallPWA = () => {
  const isStandalone = useIsStandalone();
  const { supported, promptInstall, deferred, outcome } = usePWAInstallPrompt();
  const navigate = useNavigate();
  const { unsupportedPush, reason } = detectPWAPushSupport();
  const env = parseClientEnvironment();

  const proceed = (to: string) => {
    try {
      localStorage.setItem('pwaInstallSeen', '1');
    } catch {
      /* ignore storage errors */
    }
    navigate(to, { replace: true });
  };

  useEffect(() => {
    // outcome をログ（必要なら削除可）
    if (outcome) console.log('PWA install outcome:', outcome);
    if (outcome) {
      // インストール試行結果が出たら次へ進めるようにフラグ保存
      try {
        localStorage.setItem('pwaInstallSeen', '1');
      } catch {
        /* ignore */
      }
    }
  }, [outcome]);

  if (isStandalone) {
    return (
      <PageContainer>
        <div className="space-y-4 w-full max-w-md mx-auto text-center">
          <p className="text-2xl font-bold">PWA 版で開いています</p>
          <p>この画面は既にホーム画面インストール済みまたはスタンドアロン表示です。</p>
          <MDButton text="ホームへ戻る" arrowRight link="/" />
        </div>
      </PageContainer>
    );
  }

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const requiredBrowser = ios ? 'Safari' : 'Chrome';
  const browserMismatch = env.browser !== requiredBrowser;

  if (browserMismatch) {
    return (
      <PageContainer>
        <div className="space-y-5 w-full max-w-md mx-auto text-center px-4">
          <p className="text-2xl font-bold">対応ブラウザで開いてください</p>
          <p className="text-sm text-gray-700">このページは {ios ? 'iOS では Safari' : 'Safari 以外では Google Chrome'} を使用する必要があります。</p>
          <div className="text-[11px] text-gray-500 bg-gray-100 rounded px-2 py-1 leading-snug">
            <p className="font-medium mb-0.5">現在の検出環境</p>
            <p className="break-all">
              OS: {env.os} {env.osVersion} / Browser: {env.browser} {env.browserVersion}
            </p>
          </div>
          <BrowserMatrix />
          {ios ? (
            <div className="text-left text-xs space-y-1 bg-white/70 rounded p-3">
              <p className="font-semibold">Safari で開くには</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>現在の URL をコピー</li>
                <li>ホーム画面で Safari を開く</li>
                <li>アドレスバーに貼り付けて移動</li>
              </ol>
              <p className="pt-1">Chrome / Edge / その他アプリ内ブラウザでは通知やインストール要件が満たせません。</p>
            </div>
          ) : (
            <div className="text-left text-xs space-y-1 bg-white/70 rounded p-3">
              <p className="font-semibold">Chrome で開くには</p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Chrome を起動 (未インストールならインストール)</li>
                <li>アドレスバーに URL を入力</li>
                <li>ページへアクセス</li>
              </ol>
              <p className="pt-1">Edge / Safari / Firefox / その他ブラウザはサポート対象外です。</p>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-5 w-full max-w-md mx-auto text-center px-4">
        <p className="text-2xl font-bold">アプリとしてインストール</p>
        <p className="text-sm text-gray-700">
          このアプリは、実際のアプリのように、デバイスにインストールして使うことができます。以下に「インストール可能」と表示されている場合は、なるべくインストールしてください。
        </p>
        <p className="text-sm text-gray-700">インストールすることで、通知を受け取ることができるようになり、すべての機能を使用することができるようになります。</p>
        <p className="text-sm text-gray-700">何らかの理由でインストールできない、デバイスが対応していない場合は、このままWeb版を使用してください。</p>
        <div className="text-[11px] text-gray-500 bg-gray-100 rounded px-2 py-1 leading-snug">
          <p className="font-medium mb-0.5">現在の環境</p>
          <p className="break-all">
            OS: {env.os} {env.osVersion} / Browser: {env.browser} {env.browserVersion}
          </p>
        </div>
        {unsupportedPush && (
          <div className="p-3 rounded-md bg-yellow-50 border border-yellow-300 text-left text-xs text-yellow-800 leading-snug">
            <p className="font-semibold mb-1">現在のブラウザ / OS では PWA 経由のプッシュ通知は利用できません ({reason}).</p>
            <p className="mb-1">そのためインストールは必須ではありません。直接ログインして利用を開始できます。</p>
            <p>新しいバージョン(iOS 16.4+/Safari 16.4+) にアップデートすることで通知が有効になります。</p>
          </div>
        )}
        {!unsupportedPush && supported && deferred && (
          <div className="space-y-3">
            <p className="font-semibold">ブラウザがインストールに対応しています。</p>
            <MDButton text="インストールダイアログを開く" arrowRight onClick={promptInstall} />
          </div>
        )}
        {!unsupportedPush && !supported && !ios && (
          <div className="space-y-2">
            <p className="font-semibold">ブラウザのメニューから「インストール」または「アプリをインストール」を選択してください。</p>
            <p className="text-xs text-gray-600">(Chrome: 右上︙ → インストール / Edge: … → アプリ → このサイトをインストール)</p>
          </div>
        )}
        {!unsupportedPush && ios && (
          <div className="space-y-2 text-left">
            <p className="font-semibold text-center">iOS (Safari) の場合:</p>
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Safari の共有ボタン(□↑)をタップ</li>
              <li>「ホーム画面に追加」を選択</li>
              <li>右上の「追加」をタップ</li>
            </ol>
          </div>
        )}
        <BrowserMatrix />
        {outcome === 'accepted' && <p className="text-green-600 font-semibold">インストールを受け付けました。ホーム画面を確認してください。</p>}
        {outcome === 'dismissed' && <p className="text-orange-600 text-sm">インストールがキャンセルされました。後でもう一度お試しください。</p>}
        <div className="pt-4 space-y-3">
          <MDButton text={unsupportedPush ? 'ログインへ進む (通知非対応)' : 'とりあえずログインへ進む'} arrowRight onClick={() => proceed('/login')} />
          {!unsupportedPush && <MDButton text="後でまた表示" arrowRight onClick={() => proceed('/login')} />}
        </div>
      </div>
    </PageContainer>
  );
};

export default InstallPWA;

// 画面全体高さを Header/Footer の 1fr グリッド内で埋めつつスクロール許可
function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full w-full py-10 px-2 flex flex-col items-stretch overflow-y-auto">{children}</div>;
}

function BrowserMatrix() {
  const rows: { platform: string; browsers: { name: string; icon: string; status: 'supported' | 'partial' | 'unsupported'; note?: string }[] }[] = [
    {
      platform: 'iOS / iPadOS',
      browsers: [
        { name: 'Safari', icon: safariIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Chrome', icon: chromeIcon, status: 'unsupported', note: '動作しません ✗' },
        { name: 'Brave', icon: braveIcon, status: 'unsupported', note: '動作しません ✗' },
        { name: 'Firefox', icon: firefoxIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Edge', icon: edgeIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Vivaldi', icon: vivaldiIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Opera', icon: operaIcon, status: 'partial', note: '動作未確認 △' }
      ]
    },
    {
      platform: 'Android',
      browsers: [
        { name: 'Chrome', icon: chromeIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Edge', icon: edgeIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Brave', icon: braveIcon, status: 'partial', note: '一応動作 ✓' },
        { name: 'Samsung', icon: samsungIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Opera', icon: operaIcon, status: 'unsupported', note: '動作しません ✗' },
        { name: 'Firefox', icon: firefoxIcon, status: 'unsupported', note: '動作しません ✗' },
        { name: 'Vivaldi', icon: vivaldiIcon, status: 'unsupported', note: '動作しません ✗' }
      ]
    },
    {
      platform: 'Windows / macOS / Linux',
      browsers: [
        { name: 'Chrome', icon: chromeIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Edge', icon: edgeIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Firefox', icon: firefoxIcon, status: 'supported', note: '動作 ✓' },
        { name: 'Safari', icon: safariIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Opera', icon: operaIcon, status: 'partial', note: '動作未確認 △' }
      ]
    }
  ];
  return (
    <div className="mt-6 w-full max-w-md mx-auto">
      <p className="text-sm font-semibold mb-2">対応ブラウザ一覧</p>
      <div className="border border-gray-200 rounded-md overflow-hidden text-[11px] bg-white/70">
        {rows.map((r) => (
          <div key={r.platform} className="border-t first:border-t-0 border-gray-200">
            <div className="px-2 py-1.5 bg-gray-50 font-medium text-gray-700">{r.platform}</div>
            <div className="grid grid-cols-2 gap-2 p-2">
              {r.browsers.map((b) => (
                <div key={b.name} className="flex items-center space-x-2 p-1 rounded border border-gray-100 bg-white/60">
                  <img src={b.icon || genericIcon} alt={b.name} width={16} height={16} className="shrink-0" />
                  <span className="font-medium">{b.name}</span>
                  <StatusPill status={b.status} note={b.note} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status, note }: { status: 'supported' | 'partial' | 'unsupported'; note?: string }) {
  const base = 'px-1.5 py-0.5 rounded text-[10px] ml-auto';
  const color: Record<string, string> = {
    supported: 'bg-green-600 text-white',
    partial: 'bg-yellow-500 text-white',
    unsupported: 'bg-red-400 text-white'
  };
  return <span className={`${base} ${color[status]}`}>{note || status}</span>;
}
