import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { AuthProvider, useAuth } from './auth-context';
import { messaging } from './firebase';
import Header from './components/Header';
import FloatingPWAInstallButton from './components/FloatingPWAInstallButton';
import Footer from './components/Footer';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import UserAdmin from './pages/UserAdmin';
import Page404 from './pages/Page404';
import Otanoshimi from './pages/Otanoshimi';
import TeacherIndex from './pages/TeacherIndex';
import Call from './pages/Call';
import OtanoshimiAdmin from './pages/OtanoshimiAdmin';
import NonNotification from './pages/NonNotification';
import TeacherRollCallList from './pages/TeacherRollCallList';
import Credits from './pages/Credits';
import TeacherRollCall from './pages/TeacherRollCall';
import TeacherRollCallViewer from './pages/TeacherRollCallViewer';
import TeacherIndexTable from './pages/TeacherIndexTable';
import TeacherAdmin from './pages/TeacherAdmin';
import RollCallHistory from './pages/RollCallHistory';
import InstallPWA from './pages/InstallPWA';
import EnvDebug from './pages/EnvDebug';
import VersionMismatch from './pages/VersionMismatch';
import React from 'react';
import { SERVER_ENDPOINT } from './config/serverEndpoint';
import ScheduleAdmin from './pages/ScheduleAdmin';
import { appFetch } from './helpers/apiClient';
import Yotei from './pages/Yotei';
import Maps from './pages/Maps';
import GoodsCheck from './pages/GoodsCheck';
import Goods from './pages/Goods';
import Shinkansen from './pages/Shinkansen';
import Boats from './pages/Boats';
import BoatsAdmin from './pages/BoatsAdmin';

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  componentDidCatch(error: unknown, info: unknown) {
    // Safari デバッグ用: localStorage に最後のエラーを保存
    try {
      localStorage.setItem('lastRenderError', String(error));
    } catch {
      /* ignore store error */
    }
    console.error('App boundary caught error', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-sm text-red-700 bg-red-50 min-h-dvh">
          <p className="font-bold mb-2">アプリでエラーが発生しました。</p>
          <p className="mb-2 break-all">{String(this.state.error)}</p>
          <p className="text-xs text-gray-500">Safari で白画面になる問題の暫定デバッグ表示です。再読み込みを試してください。</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// ログイン状態をチェックし、未ログインならログインページにリダイレクト
function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <CenterMessage>認証中...</CenterMessage>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

// 通知権限をチェックし、未許可なら専用ページにリダイレクト
function NotificationGuard() {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Safari (<16.4) など Notification API 未実装環境での ReferenceError 防止
  const initialPermission: NotificationPermission = typeof Notification !== 'undefined' && typeof Notification.permission === 'string' ? Notification.permission : 'default';
  const [permission, setPermission] = useState<NotificationPermission>(initialPermission);
  const [permReady, setPermReady] = useState(false); // 一部Safariで初期読み取りが不安定なため、判定前に短い安定化待ち
  useEffect(() => {
    // /non-notification 表示中は数秒おきにサイレント登録を試みる（既に権限ありでも誤判定されるSafari対策）
    if (!user) return;
    const path = typeof window !== 'undefined' ? window.location.pathname : '';
    if (path !== '/non-notification') return;
    let timer: number | undefined;
    const loop = () => {
      try {
        // フラグが立っていれば停止
        if (localStorage.getItem('notifications_enabled') === '1') return;
      } catch {
        /* ignore */
      }
      // 軽量の動的 import で循環依存を避ける
      import('./helpers/notifications').then((m) => m.attemptSilentRegistration?.(user)).catch(() => {});
      timer = window.setTimeout(loop, 5000);
    };
    timer = window.setTimeout(loop, 1500);
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [user]);
  // 許可試行後に即座に default -> granted へ遷移しない iOS 対策として、
  // 直近試行時間 (localStorage) を用いたグレース期間のみ利用。

  useEffect(() => {
    type NavigatorWithPermissions = typeof navigator & {
      permissions?: {
        query: (descriptor: { name: PermissionName | 'notifications' }) => Promise<{
          state: NotificationPermission;
          onchange: null | (() => void);
        }>;
      };
    };
    const hasPermissionsApi =
      typeof navigator !== 'undefined' && (navigator as NavigatorWithPermissions).permissions && typeof (navigator as NavigatorWithPermissions).permissions?.query === 'function';

    if (hasPermissionsApi) {
      try {
        (navigator as NavigatorWithPermissions)
          .permissions!.query({ name: 'notifications' as PermissionName })
          .then((status: PermissionStatus) => {
            setPermission(status.state as NotificationPermission);
            status.onchange = () => setPermission(status.state as NotificationPermission);
            // 最初の結果を受け取ったので安定化完了
            setPermReady(true);
          })
          .catch(() => {
            if (typeof Notification !== 'undefined') {
              const interval = setInterval(() => setPermission(Notification.permission as NotificationPermission), 1500);
              // permissions API が使えない場合も、少し待ってからreadyに
              setTimeout(() => setPermReady(true), 200);
              return () => clearInterval(interval);
            }
          });
      } catch {
        /* noop */
      }
    } else if (typeof Notification !== 'undefined') {
      const interval = setInterval(() => setPermission(Notification.permission as NotificationPermission), 1500);
      setTimeout(() => setPermReady(true), 200);
      return () => clearInterval(interval);
    }
    // 最低限、次フレームで一度同期読み取りしてreadyにする
    const raf = requestAnimationFrame(() => {
      try {
        if (typeof Notification !== 'undefined') setPermission(Notification.permission as NotificationPermission);
      } finally {
        setPermReady(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (loading) return <CenterMessage>認証中...</CenterMessage>;

  // FCMトークン登録成功時に立つローカルフラグ（誤判定抑止用の実質有効判定）
  let locallyEnabled = false;
  try {
    locallyEnabled = localStorage.getItem('notifications_enabled') === '1';
  } catch {
    /* ignore */
  }

  // 判定が安定するまで待つ（Safari初期化時の一瞬のdefaultを拾って誤誘導しない）
  if (!permReady) return <CenterMessage>通知状態を確認中...</CenterMessage>;

  const isEffectivelyGranted = permission === 'granted' || locallyEnabled;

  // 通知は必須: 実質未許可（default/denied かつローカルフラグもなし）は専用ページへ誘導
  if (user && location.pathname !== '/non-notification' && !isEffectivelyGranted) {
    return <Navigate to="/non-notification" replace />;
  }
  if (user && location.pathname === '/non-notification' && isEffectivelyGranted) {
    return <Navigate to={user.is_teacher ? '/teacher' : '/'} replace />;
  }
  return <Outlet />;
}

// PWA インストール案内を通知許可チェックより先に挟むガード
function PWAInstallGuard() {
  const location = useLocation();
  // 開発環境 (vite dev / import.meta.env.PROD === false) では PWA インストール状態を問わずそのまま通す
  if (!import.meta.env.PROD) {
    return <Outlet />;
  }
  let isStandalone = false;
  try {
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const mq = window.matchMedia('(display-mode: standalone)');
      const nav = navigator as Navigator & { standalone?: boolean };
      isStandalone = mq.matches || nav.standalone === true;
    }
  } catch (e) {
    console.warn('PWAInstallGuard standalone detection failed', e);
  }
  if (!isStandalone && location.pathname !== '/install') {
    return <Navigate to="/install" replace state={{ from: location.pathname + location.search }} />;
  }
  if (isStandalone && location.pathname === '/install') {
    const state = location.state as { from?: string } | null;
    return <Navigate to={state?.from || '/login'} replace />;
  }
  return <Outlet />;
}

// 管理者または教員かどうかをチェック
function AdminOrTeacherRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user && (user.is_admin || user.is_teacher)) return <>{children}</>;
  return <CenterMessage>閲覧権限がありません</CenterMessage>;
}

// 汎用センタリングメッセージ
function CenterMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-[80dvh]">
      <p className="text-xl">{children}</p>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const FadeContainer = ({ children }: { children: ReactNode }) => <div className="page-fade">{children}</div>;
  const [versionChecked, setVersionChecked] = useState(false);
  const [versionMismatch, setVersionMismatch] = useState(false);

  // バージョンチェック (最初のレンダリング前に判定し、ミスマッチ時のみ遷移)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await appFetch<{ version?: string }>(`${SERVER_ENDPOINT}/api/version`, { parse: 'json', alwaysFetch: true });
        const current = import.meta.env.APP_VERSION;
        if (active && data.version && current && data.version !== current) {
          setVersionMismatch(true);
          if (location.pathname !== '/version-mismatch') {
            const from = window.location.pathname + window.location.search;
            navigate('/version-mismatch', { replace: true, state: { from } });
          }
        }
      } catch (e) {
        console.warn('version check failed', e);
      } finally {
        if (active) setVersionChecked(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate, location.pathname]);

  useEffect(() => {
    // 開発中(vite dev)は SW を登録しない: importScripts + CDN 利用での頻繁な SyntaxError/リロードを避ける
    // 本番ビルド (import.meta.env.PROD) のみ登録
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then(() => {
          // 登録成功時のログ (必要なら DEBUG 変数で制御可能)
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }
    const unsubscribe = onMessage(messaging, async (payload) => {
      if (payload.data?.type === 'default_notification') {
        // iOS SafariではフォアグラウンドでもOS通知を出す方が気付きやすい
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg && Notification.permission === 'granted') {
              await reg.showNotification(payload.data.originalTitle || '通知', {
                body: payload.data.originalBody || '',
                icon: '/icon.png',
                data: { url: payload.data.link || '/' }
              });
              return;
            }
          }
        } catch {
          /* ignore */
        }
        // フォールバック: 既存のalert
        alert(`${payload.data.originalTitle}\n${payload.data.originalBody}`);
        if (payload.data.link) navigate(payload.data.link);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-dvh">
      <Header />
      <FloatingPWAInstallButton />
      <main>
        {!versionChecked && <div className="flex items-center justify-center h-[60dvh] text-sm text-gray-600">バージョン確認中...</div>}
        {versionChecked && (
          <Routes>
            {/* バージョン不一致時のみ VersionMismatch を有効化 */}
            {versionMismatch ? (
              <Route
                path="/version-mismatch"
                element={
                  <FadeContainer>
                    <VersionMismatch />
                  </FadeContainer>
                }
              />
            ) : (
              <Route path="/version-mismatch" element={<Navigate to="/" replace />} />
            )}
            {/* PWA 未インストール時は常に /install へ誘導 (ただし version-mismatch には干渉しない) */}
            <Route element={<PWAInstallGuard />}>
              <Route
                path="/login"
                element={
                  <FadeContainer>
                    <Login />
                  </FadeContainer>
                }
              />
              <Route
                path="/install"
                element={
                  <FadeContainer>
                    <InstallPWA />
                  </FadeContainer>
                }
              />
              {/* ログイン後領域 */}
              <Route element={<ProtectedRoute />}>
                <Route element={<NotificationGuard />}>
                  <Route
                    path="/"
                    element={
                      <FadeContainer>
                        <Index />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/otanoshimi"
                    element={
                      <FadeContainer>
                        <Otanoshimi />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/call"
                    element={
                      <FadeContainer>
                        <Call />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/credits"
                    element={
                      <FadeContainer>
                        <Credits />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/teacher"
                    element={
                      <FadeContainer>
                        <TeacherIndex />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/env-debug"
                    element={
                      <FadeContainer>
                        <EnvDebug />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/teacher/search"
                    element={
                      <FadeContainer>
                        <TeacherIndexTable />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/teacher/roll-call-list"
                    element={
                      <FadeContainer>
                        <TeacherRollCallList />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/teacher/call"
                    element={
                      <FadeContainer>
                        <TeacherRollCall />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/teacher/call-viewer"
                    element={
                      <FadeContainer>
                        <TeacherRollCallViewer />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/roll-call-history"
                    element={
                      <FadeContainer>
                        <RollCallHistory />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/admin"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <Admin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/user-admin"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <UserAdmin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/otanoshimi-admin"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <OtanoshimiAdmin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/teacher-admin"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <TeacherAdmin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/yotei"
                    element={
                      <FadeContainer>
                        <Yotei />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/goods-check"
                    element={
                      <FadeContainer>
                        <GoodsCheck />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/maps"
                    element={
                      <FadeContainer>
                        <Maps />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/goods"
                    element={
                      <FadeContainer>
                        <Goods />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/shinkansen"
                    element={
                      <FadeContainer>
                        <Shinkansen />
                      </FadeContainer>
                    }
                  />
                  <Route
                    path="/admin/schedules"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <ScheduleAdmin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/admin/boats"
                    element={
                      <AdminOrTeacherRoute>
                        <FadeContainer>
                          <BoatsAdmin />
                        </FadeContainer>
                      </AdminOrTeacherRoute>
                    }
                  />
                  <Route
                    path="/boats"
                    element={
                      <FadeContainer>
                        <Boats />
                      </FadeContainer>
                    }
                  />
                </Route>
                {/* NotificationGuard 終了 */}
              </Route>
              {/* PWAInstallGuard 終了 */}
              <Route
                path="/non-notification"
                element={
                  <FadeContainer>
                    <NonNotification />
                  </FadeContainer>
                }
              />
            </Route>
            <Route
              path="*"
              element={
                <FadeContainer>
                  <Page404 />
                </FadeContainer>
              }
            />
          </Routes>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ルート変更ごとにスクロールをトップへ戻す
function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    if ('scrollRestoration' in history) {
      try {
        history.scrollRestoration = 'manual';
      } catch {
        // 一部ブラウザで設定失敗しても無視
      }
    }
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    });
  }, [location.pathname, location.search]);
  return null;
}

const AppWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <ScrollToTop />
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </AuthProvider>
  </BrowserRouter>
);

export default AppWrapper;
