import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { onMessage } from 'firebase/messaging';
import { AuthProvider, useAuth } from './auth-context';
import { messaging } from './firebase';
import Header from './components/Header';
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
  const [permission, setPermission] = useState<NotificationPermission>(Notification.permission);

  useEffect(() => {
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((status) => {
        setPermission(status.state as NotificationPermission);
        status.onchange = () => setPermission(status.state as NotificationPermission);
      });
    } else {
      const interval = setInterval(() => setPermission(Notification.permission), 1000);
      return () => clearInterval(interval);
    }
  }, []);

  if (loading) return <CenterMessage>認証中...</CenterMessage>;
  if (user && permission !== 'granted' && location.pathname !== '/non-notification') {
    return <Navigate to="/non-notification" replace />;
  }
  if (user && permission === 'granted' && location.pathname === '/non-notification') {
    return <Navigate to={user.is_teacher ? '/teacher' : '/'} replace />;
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
  const FadeContainer = ({ children }: { children: ReactNode }) => <div className="page-fade">{children}</div>;

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
    const unsubscribe = onMessage(messaging, (payload) => {
      if (payload.data?.type === 'default_notification') {
        alert(`${payload.data.originalTitle}\n${payload.data.originalBody}`);
        if (payload.data.link) navigate(payload.data.link);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-dvh">
      <Header />
      <main>
        <Routes>
          <Route
            path="/login"
            element={
              <FadeContainer>
                <Login />
              </FadeContainer>
            }
          />
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
            </Route>
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
      <App />
    </AuthProvider>
  </BrowserRouter>
);

export default AppWrapper;
