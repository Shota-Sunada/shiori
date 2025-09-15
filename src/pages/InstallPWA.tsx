import { useMemo } from 'react';
import MDButton from '../components/MDButton';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';
import { detectPWAPushSupport, parseClientEnvironment } from '../helpers/pwaSupport';
import { getDetailedInstallBlock } from '../config/pwaInstallSteps';
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

// ===================== 定数 / 設定 =====================
import type { PlatformRow, SupportStatus } from '../interface/models';

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

// 一元的サポートマトリクス (動作ノート込み)
const SUPPORT_MATRIX: PlatformRow[] = [
  {
    platform: 'iOS / iPadOS',
    match: (os) => os === 'iOS',
    browsers: [
      { name: 'Safari', icon: safariIcon, status: 'supported', note: '動作 ✓' },
      { name: 'Edge', icon: edgeIcon, status: 'partial', note: '未確認 △' },
      { name: 'Firefox', icon: firefoxIcon, status: 'partial', note: '未確認 △' },
      { name: 'Vivaldi', icon: vivaldiIcon, status: 'partial', note: '未確認 △' },
      { name: 'Opera', icon: operaIcon, status: 'partial', note: '未確認 △' },
      { name: 'Chrome', icon: chromeIcon, status: 'unsupported', note: '不良 ✗' },
      { name: 'Brave', icon: braveIcon, status: 'unsupported', note: '不良 ✗' }
    ]
  },
  {
    platform: 'Android',
    match: (os) => os === 'Android',
    browsers: [
      { name: 'Chrome', icon: chromeIcon, status: 'supported', note: '動作 ✓' },
      { name: 'Edge', icon: edgeIcon, status: 'supported', note: '動作 ✓' },
      { name: 'Brave', icon: braveIcon, status: 'partial', note: '一応 ✓' },
      { name: 'Samsung', icon: samsungIcon, status: 'partial', note: '未確認 △' },
      { name: 'Firefox', icon: firefoxIcon, status: 'unsupported', note: '不良 ✗' },
      { name: 'Vivaldi', icon: vivaldiIcon, status: 'unsupported', note: '不良 ✗' },
      { name: 'Opera', icon: operaIcon, status: 'unsupported', note: '不良 ✗' }
    ]
  },
  {
    platform: 'Windows / macOS / Linux',
    match: (os) => ['Windows', 'macOS', 'Linux'].includes(os),
    browsers: [
      { name: 'Chrome', icon: chromeIcon, status: 'supported', note: '動作 ✓' },
      { name: 'Edge', icon: edgeIcon, status: 'supported', note: '動作 ✓' },
      { name: 'Safari', icon: safariIcon, status: 'partial', note: '未確認 △' },
      { name: 'Firefox', icon: firefoxIcon, status: 'unsupported', note: '一部不良 ✗' },
      { name: 'Vivaldi', icon: vivaldiIcon, status: 'unsupported', note: '不良 ✗' },
      { name: 'Opera', icon: operaIcon, status: 'unsupported', note: '非推奨 ✗' }
    ]
  }
];

// ===================== ヘルパ =====================
function getSupportContext(os: string, browser: string) {
  const row = SUPPORT_MATRIX.find((r) => r.match(os));
  const info = row?.browsers.find((b) => b.name === browser);
  return {
    platformRow: row,
    browserStatus: info?.status as SupportStatus | undefined,
    supportedBrowserNames: row?.browsers.filter((b) => b.status === 'supported').map((b) => b.name) || []
  };
}

function DetailedInstallSteps({ os, browser, ios }: { os: string; browser: string; ios: boolean }) {
  const block = getDetailedInstallBlock(os, browser, ios);
  const osIcon = OS_ICONS[os] || genericIcon;
  const browserIcon = BROWSER_ICONS[browser] || genericIcon;
  const iconSet = block.type === 'steps' ? [osIcon, browserIcon] : [osIcon];
  if (block.type === 'steps') {
    return (
      <StepBlock title={block.title} note={block.note} icons={iconSet}>
        {block.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </StepBlock>
    );
  }
  return <NoteBlock title={block.title} body={block.body} icons={iconSet} />;
}

// 再利用可能な小コンポーネント群
function StepBlock({ title, children, note, icons }: { title: string; children: React.ReactNode; note?: string; icons?: string[] }) {
  return (
    <div className="text-sm space-y-3 bg-white/90 rounded-2xl border border-gray-200 shadow-sm p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {icons?.map((src, i) => (
          <img key={i} src={src} alt="icon" className="w-5 h-5 shrink-0" />
        ))}
        <p className="font-medium">{title}</p>
      </div>
      <ol className="list-decimal ml-5 space-y-1 marker:text-blue-600 marker:font-semibold">{children}</ol>
      {note && <p className="text-xs text-gray-500">{note}</p>}
    </div>
  );
}
function NoteBlock({ title, body, icons }: { title: string; body: string; icons?: string[] }) {
  return (
    <div className="text-sm space-y-2 bg-white/90 rounded-2xl border border-gray-200 shadow-sm p-4 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {icons?.map((src, i) => (
          <img key={i} src={src} alt="icon" className="w-5 h-5 shrink-0" />
        ))}
        <p className="font-medium">{title}</p>
      </div>
      <p>{body}</p>
    </div>
  );
}

// Overview (以前の "この環境でのインストール概要" 表示) は不要となり削除

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
  const { promptInstall, outcome } = usePWAInstallPrompt();
  const { unsupportedPush, reason } = detectPWAPushSupport();
  const env = parseClientEnvironment();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const { browserStatus, supportedBrowserNames } = getSupportContext(env.os, env.browser);
  const isSupportedEnv = browserStatus === 'supported';

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

  const currentBrowserIcon = BROWSER_ICONS[env.browser] || genericIcon;
  const currentOsIcon = OS_ICONS[env.os] || genericIcon;

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
            <div className="space-y-1">
              <p className="font-medium">推奨ブラウザで開く簡易手順</p>
              <ol className="list-decimal ml-5 space-y-1">
                {ios && <li>ホーム画面で Safari を起動</li>}
                <li>アドレスバーに URL を入力</li>
                <li>ページへアクセス</li>
              </ol>
            </div>
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
          <div className="space-y-6 text-left">
            <div className="space-y-4 text-center flex flex-col items-center justify-center">
              <p className="font-semibold">インストール可能</p>
              <MDButton text="インストール" arrowRight onClick={promptInstall} />
              <p className="text-xs text-gray-600">上手くいかない場合は下記補足を参照してください。</p>
              <div className="text-xs bg-white/70 rounded p-3 space-y-2 w-full text-left">
                <p className="font-medium">インストール項目が表示されない / 失敗する場合</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>数回ページ操作後に再度インストールを試す。</li>
                  <li>ブラウザを再起動してキャッシュを更新。</li>
                  {ios ? <li>必ず Safari を使用 (共有ボタンから追加)。他ブラウザは非対応。</li> : <li>Chrome / Edge を最新版へ更新。</li>}
                  <li>それでも出ない場合は下の「対応ブラウザ一覧」を確認し推奨ブラウザへ切替。</li>
                </ul>
              </div>
            </div>
            <div className="space-y-5 flex flex-col items-stretch">
              <p className="font-semibold text-center">インストール (ホーム画面追加) 詳細手順</p>
              <DetailedInstallSteps os={env.os} browser={env.browser} ios={ios} />
              <div className="text-xs bg-white/70 rounded p-3 space-y-2">
                <p className="font-medium">インストール項目が表示されない場合</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>数回利用 (ナビゲーション) 後にバナーが出ることがあります。</li>
                  <li>ブラウザを一度終了して再起動。</li>
                  {ios ? <li>iOS は Safari の共有メニューからのみ追加可能。</li> : <li>Chrome / Edge の最新版を利用しているか確認。</li>}
                  <li>出ない場合でもメニュー内「ホーム画面に追加」等で手動追加できます。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <BrowserMatrix currentBrowserName={env.browser} currentOS={env.os} />
        {outcome === 'accepted' && <p className="text-green-600 font-semibold">インストールを受け付けました。ホーム画面を確認してください。</p>}
        {outcome === 'dismissed' && <p className="text-orange-600 text-base">インストールがキャンセルされました。後でもう一度お試しください。</p>}
        {/* {!(isSupportedEnv && !unsupportedPush) && (
          <div className="pt-4 flex flex-col items-center justify-center">
            <MDButton text={unsupportedPush ? 'インストールせず続行 (通知非対応)' : 'インストールせず続行'} arrowRight onClick={() => proceed('/login')} />
          </div>
        )} */}
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
  const rows = SUPPORT_MATRIX.map((r) => ({ platform: r.platform, browsers: r.browsers }));
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
                        {isRecommended && <span className="text-[10px] leading-none px-1.5 py-[3px] rounded bg-emerald-600 text-white">推奨</span>}
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
