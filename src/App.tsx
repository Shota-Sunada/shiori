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

export const SERVER_ENDPOINT = 'https://api.shiori.shudo-physics.com';

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

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((err) => {
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
    <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-[100dvh]">
      <Header />
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<NotificationGuard />}>
              <Route path="/" element={<Index />} />
              <Route path="/otanoshimi" element={<Otanoshimi />} />
              <Route path="/call" element={<Call />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/teacher" element={<TeacherIndex />} />
              <Route path="/teacher/search" element={<TeacherIndexTable />} />
              <Route path="/teacher/roll-call-list" element={<TeacherRollCallList />} />
              <Route path="/teacher/call" element={<TeacherRollCall />} />
              <Route path="/teacher/call-viewer" element={<TeacherRollCallViewer />} />
              <Route path="/roll-call-history" element={<RollCallHistory />} />
              <Route
                path="/admin"
                element={
                  <AdminOrTeacherRoute>
                    <Admin />
                  </AdminOrTeacherRoute>
                }
              />
              <Route
                path="/user-admin"
                element={
                  <AdminOrTeacherRoute>
                    <UserAdmin />
                  </AdminOrTeacherRoute>
                }
              />
              <Route
                path="/otanoshimi-admin"
                element={
                  <AdminOrTeacherRoute>
                    <OtanoshimiAdmin />
                  </AdminOrTeacherRoute>
                }
              />
              <Route
                path="/teacher-admin"
                element={
                  <AdminOrTeacherRoute>
                    <TeacherAdmin />
                  </AdminOrTeacherRoute>
                }
              />
            </Route>
            <Route path="/non-notification" element={<NonNotification />} />
          </Route>
          <Route path="*" element={<Page404 />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

const AppWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

export default AppWrapper;
