import { useEffect, useMemo, useState } from 'react';
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
// OS icons (32x32)
import winIcon from '@egoistdeveloper/operating-system-logos/src/32x32/WIN.png';
import andIcon from '@egoistdeveloper/operating-system-logos/src/32x32/AND.png';
import iosIcon from '@egoistdeveloper/operating-system-logos/src/32x32/IOS.png';
import macIcon from '@egoistdeveloper/operating-system-logos/src/32x32/MAC.png';
import linIcon from '@egoistdeveloper/operating-system-logos/src/32x32/LIN.png';

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
  const [showFallbackHelp, setShowFallbackHelp] = useState(false);

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
        <div className="space-y-5 w-full max-w-md mx-auto text-center text-[17px] leading-relaxed">
          <p className="text-3xl font-bold">PWA 版で開いています</p>
          <p>この画面は既にホーム画面インストール済みまたはスタンドアロン表示です。</p>
          <MDButton text="ホームへ戻る" arrowRight link="/" />
        </div>
      </PageContainer>
    );
  }

  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // icon mapping
  const browserIcons: Record<string, string> = {
    Safari: safariIcon,
    Chrome: chromeIcon,
    Edge: edgeIcon,
    Firefox: firefoxIcon,
    Samsung: samsungIcon,
    Vivaldi: vivaldiIcon,
    Brave: braveIcon,
    Opera: operaIcon
  };
  const osIcons: Record<string, string> = {
    Windows: winIcon,
    Android: andIcon,
    iOS: iosIcon,
    macOS: macIcon,
    Linux: linIcon
  };
  const currentBrowserIcon = browserIcons[env.browser] || genericIcon;
  const currentOsIcon = osIcons[env.os] || genericIcon;

  // BrowserMatrix の定義と同じロジックで現在 OS 行を判定し、現在ブラウザのサポート状況を取得
  const matrixRows = [
    {
      platform: 'iOS / iPadOS',
      match: (os: string) => os === 'iOS',
      browsers: [
        { name: 'Safari', icon: safariIcon, status: 'supported' as const },
        { name: 'Chrome', icon: chromeIcon, status: 'unsupported' as const },
        { name: 'Brave', icon: braveIcon, status: 'unsupported' as const },
        { name: 'Firefox', icon: firefoxIcon, status: 'partial' as const },
        { name: 'Edge', icon: edgeIcon, status: 'partial' as const },
        { name: 'Vivaldi', icon: vivaldiIcon, status: 'partial' as const },
        { name: 'Opera', icon: operaIcon, status: 'partial' as const }
      ]
    },
    {
      platform: 'Android',
      match: (os: string) => os === 'Android',
      browsers: [
        { name: 'Chrome', icon: chromeIcon, status: 'supported' as const },
        { name: 'Edge', icon: edgeIcon, status: 'supported' as const },
        { name: 'Brave', icon: braveIcon, status: 'partial' as const },
        { name: 'Samsung', icon: samsungIcon, status: 'partial' as const },
        { name: 'Opera', icon: operaIcon, status: 'unsupported' as const },
        { name: 'Firefox', icon: firefoxIcon, status: 'unsupported' as const },
        { name: 'Vivaldi', icon: vivaldiIcon, status: 'unsupported' as const }
      ]
    },
    {
      platform: 'Windows / macOS / Linux',
      match: (os: string) => ['Windows', 'macOS', 'Linux'].includes(os),
      browsers: [
        { name: 'Chrome', icon: chromeIcon, status: 'supported' as const },
        { name: 'Edge', icon: edgeIcon, status: 'supported' as const },
        { name: 'Firefox', icon: firefoxIcon, status: 'unsupported' as const },
        { name: 'Safari', icon: safariIcon, status: 'partial' as const },
        { name: 'Opera', icon: operaIcon, status: 'partial' as const }
      ]
    }
  ];
  const currentRow = matrixRows.find((r) => r.match(env.os));
  const currentBrowserStatus = currentRow?.browsers.find((b) => b.name === env.browser)?.status;
  const isSupportedEnv = currentBrowserStatus === 'supported';
  const supportedBrowserNames = currentRow?.browsers.filter((b) => b.status === 'supported').map((b) => b.name) || [];

  return (
    <PageContainer>
      <div className="space-y-7 w-full max-w-md mx-auto text-center px-4 text-[17px] leading-relaxed">
        <p className="text-3xl font-bold">PWA インストール案内</p>
        <EnvBox osIcon={currentOsIcon} browserIcon={currentBrowserIcon} env={env} />

        {!isSupportedEnv && (
          <div className="p-3 rounded-md border border-amber-300 bg-amber-50 text-left text-sm text-amber-900 space-y-3">
            <div>
              <p className="font-semibold">このブラウザではインストール機能が保証されません</p>
              <p>
                現在: <strong>{env.browser}</strong> / OS: {env.os}. 下記のサポートブラウザで開くと PWA インストールと通知が安定して動作します。
              </p>
            </div>
            {supportedBrowserNames.length > 0 && (
              <p className="text-xs">
                サポートブラウザ: <span className="font-medium">{supportedBrowserNames.join(', ')}</span>
              </p>
            )}
            {ios ? (
              <div className="space-y-1">
                <p className="font-medium">Safari で開く手順</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>このページの URL をコピー</li>
                  <li>ホーム画面で Safari を起動</li>
                  <li>アドレスバーへ貼り付けて移動</li>
                </ol>
              </div>
            ) : currentRow?.platform === 'Android' ? (
              <div className="space-y-1">
                <p className="font-medium">Chrome / Edge で開く手順</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Chrome または Edge を起動 (無ければストアからインストール)</li>
                  <li>アドレスバーに URL を入力</li>
                  <li>ページへアクセス</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">Chrome / Edge で開く手順</p>
                <ol className="list-decimal ml-5 space-y-1">
                  <li>Chrome または Edge を起動 (未インストールなら公式サイト/ストアから追加)</li>
                  <li>アドレスバーに URL を入力</li>
                  <li>ページへアクセス</li>
                </ol>
              </div>
            )}
            <p className="text-xs text-amber-700">切り替えなくても閲覧は可能ですが、通知 / オフライン / インストール機能が制限される場合があります。</p>
          </div>
        )}

        <>
          <p className="text-base text-gray-700">このアプリは、ホーム画面に追加することでアプリのように利用できます。下記で「インストール可能」と表示されている場合はインストールしてください。</p>
          <p className="text-base text-gray-700">インストールにより通知受信などすべての機能が有効になります。</p>
        </>

        {unsupportedPush && (
          <div className="p-3 rounded-md bg-yellow-50 border border-yellow-300 text-left text-sm text-yellow-800 leading-snug">
            <p className="font-semibold mb-1">現在のブラウザ / OS では PWA 経由のプッシュ通知は利用できません ({reason}).</p>
            <p className="mb-1">そのためインストールは必須ではありません。直接ログインして利用を開始できます。</p>
            <p>新しいバージョン(iOS 16.4+/Safari 16.4+) にアップデートすることで通知が有効になります。</p>
          </div>
        )}

        {isSupportedEnv && !unsupportedPush && (
          <div className="space-y-4 text-left">
            {supported && deferred ? (
              <div className="space-y-3 text-center flex flex-col items-center justify-center">
                <p className="font-semibold">インストール可能</p>
                <MDButton text="インストール" arrowRight onClick={promptInstall} />
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center justify-center">
                <p className="font-semibold">インストール (ホーム画面追加) 手順</p>
                {!ios && (
                  <p className="text-sm text-gray-700">
                    ブラウザメニューから「インストール」または「アプリをインストール」を選択してください (Chrome: 右上︙ → インストール / Edge: … → アプリ → このサイトをインストール)。
                  </p>
                )}
                {ios && (
                  <ol className="list-decimal ml-5 space-y-1 text-sm">
                    <li>Safari の共有ボタン(□↑)をタップ</li>
                    <li>「ホーム画面に追加」を選択</li>
                    <li>右上の「追加」をタップ</li>
                  </ol>
                )}
                <MDButton
                  text={showFallbackHelp ? '手順を隠す' : supported ? '再度インストールを試す' : 'ｲﾝｽﾄｰﾙ手順を表示'}
                  onClick={() => {
                    if (supported && deferred) {
                      promptInstall?.();
                    } else {
                      setShowFallbackHelp((v) => !v);
                    }
                  }}
                />
                {showFallbackHelp && !supported && (
                  <div className="text-xs bg-white/70 rounded p-3 space-y-2">
                    {!ios && (
                      <>
                        <p className="font-medium">アイコンが出ない場合</p>
                        <p>
                          バージョンが古いか、PWA インストールバナー条件をまだ満たしていない可能性があります。数回ページを利用すると出現することがあります。出ない場合でもメニューから追加できます。
                        </p>
                      </>
                    )}
                    {ios && <p>iOS では必ず Safari の共有メニューから追加します。他ブラウザではインストールが表示されません。</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <BrowserMatrix currentBrowserName={env.browser} currentOS={env.os} />
        {outcome === 'accepted' && <p className="text-green-600 font-semibold">インストールを受け付けました。ホーム画面を確認してください。</p>}
        {outcome === 'dismissed' && <p className="text-orange-600 text-base">インストールがキャンセルされました。後でもう一度お試しください。</p>}
        <div className="pt-4 space-y-3 flex flex-col items-center justify-center">
          <MDButton text={unsupportedPush ? 'ログインへ進む (通知非対応)' : 'ログインへ進む'} arrowRight onClick={() => proceed('/login')} />
          {!unsupportedPush && isSupportedEnv && <MDButton text="後でまた表示" arrowRight onClick={() => proceed('/login')} />}
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

function EnvBox({ osIcon, browserIcon, env }: { osIcon: string; browserIcon: string; env: ReturnType<typeof parseClientEnvironment> }) {
  return (
    <div className="text-[12px] text-gray-600 bg-gray-100 rounded px-3 py-2 leading-tight flex flex-col gap-1">
      <p className="font-medium text-[13px]">現在の環境</p>
      <div className="flex justify-center items-center gap-2">
        <img src={osIcon} alt={env.os} width={16} height={16} className="shrink-0" />
        <span className="truncate">
          OS: {env.os} {env.osVersion}
        </span>
      </div>
      <div className="flex justify-center items-center gap-2">
        <img src={browserIcon} alt={env.browser} width={16} height={16} className="shrink-0" />
        <span className="truncate">
          Browser: {env.browser} {env.browserVersion}
        </span>
      </div>
    </div>
  );
}

function BrowserMatrix({ currentBrowserName, currentOS }: { currentBrowserName?: string; currentOS?: string }) {
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
        { name: 'Firefox', icon: firefoxIcon, status: 'unsupported', note: '動作しません ✗' },
        { name: 'Safari', icon: safariIcon, status: 'partial', note: '動作未確認 △' },
        { name: 'Opera', icon: operaIcon, status: 'partial', note: '動作未確認 △' }
      ]
    }
  ];
  // 現在 OS と行のマッチ判定
  const matchPlatform = (platform: string) => {
    if (!currentOS) return false;
    if (platform.startsWith('iOS') && currentOS === 'iOS') return true;
    if (platform === 'Android' && currentOS === 'Android') return true;
    if (platform.startsWith('Windows / macOS / Linux') && ['Windows', 'macOS', 'Linux'].includes(currentOS)) return true;
    return false;
  };
  return (
    <div className="mt-8 w-full max-w-md mx-auto text-[15px]">
      <p className="text-base font-semibold mb-3">対応ブラウザ一覧</p>
      <div className="border border-gray-200 rounded-md overflow-hidden text-[12px] bg-white/80">
        {rows.map((r) => {
          const platformMatch = matchPlatform(r.platform);
          return (
            <div key={r.platform} className="border-t first:border-t-0 border-gray-200">
              <div className="px-2 py-1.5 font-medium flex items-center gap-2 bg-gray-50 text-gray-700">
                <span>{r.platform}</span>
              </div>
              <div className="grid grid-cols-1 gap-2 p-2">
                {r.browsers.map((b) => {
                  const isExactCurrent = platformMatch && b.name === currentBrowserName; // OS & Browser 両方一致
                  const isRecommended =
                    (r.platform.startsWith('iOS') && b.name === 'Safari') ||
                    (r.platform === 'Android' && b.name === 'Chrome') ||
                    (r.platform.startsWith('Windows / macOS / Linux') && b.name === 'Chrome');
                  return (
                    <div
                      key={b.name}
                      className={`flex items-center space-x-2 p-1 rounded border relative transition-colors ${
                        isExactCurrent ? 'border-blue-500 ring-1 ring-blue-400/60 bg-blue-50/80' : 'border-gray-100 bg-white/60'
                      }`}>
                      <img src={b.icon || genericIcon} alt={b.name} width={16} height={16} className="shrink-0" />
                      <span className="font-medium text-[12px] flex items-center gap-1">
                        {b.name}
                        {isRecommended && <span className="text-[10px] leading-none px-1 py-[1px] rounded bg-emerald-600 text-white">推奨</span>}
                      </span>
                      <StatusPill status={b.status} note={b.note} />
                      {isExactCurrent && <span className="absolute -top-1 -right-1 bg-blue-600 text-white rounded px-1 py-[1px] text-[10px] leading-none">現在</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status, note }: { status: 'supported' | 'partial' | 'unsupported'; note?: string }) {
  const base = 'px-1.5 py-0.5 rounded text-[11px] ml-auto';
  const color: Record<string, string> = {
    supported: 'bg-green-600 text-white',
    partial: 'bg-yellow-500 text-white',
    unsupported: 'bg-red-400 text-white'
  };
  return <span className={`${base} ${color[status]}`}>{note || status}</span>;
}
