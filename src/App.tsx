import { BrowserRouter, Route, Routes, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import UserAdmin from './pages/UserAdmin';
import Header from './components/Header';
import Footer from './components/Footer';
import Page404 from './pages/Page404';
import Otanoshimi from './pages/Otanoshimi';
import TeacherIndex from './pages/TeacherIndex';
import { useEffect, useState, type ReactNode } from 'react';
import TeacherCall from './pages/TeacherCall';
import Call from './pages/Call';
import OtanoshimiAdmin from './pages/OtanoshimiAdmin';
import { onMessage } from 'firebase/messaging';
import { messaging } from './firebase';
import OtanoshimiPreview from './pages/OtanoshimiPreview';
import NonNotification from './pages/NonNotification';
import TeacherRollCallList from './pages/TeacherRollCallList';
import Credits from './pages/Credits';

export const SERVER_ENDPOINT = 'https://api.shiori.shudo-physics.com';

// ログイン状態をチェックし、未ログインならログインページにリダイレクトするコンポーネント
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'認証中...'}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

// 通知権限をチェックし、未許可なら専用ページにリダイレクトするコンポーネント
const NotificationGuard = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [permission, setPermission] = useState<'default' | 'denied' | 'granted' | 'prompt'>(Notification.permission);

  useEffect(() => {
    // This effect should only run once to set up the listeners.
    if ('permissions' in navigator && 'query' in navigator.permissions) {
      navigator.permissions.query({ name: 'notifications' }).then((status) => {
        setPermission(status.state); // Set initial state
        // Update state whenever permission changes
        status.onchange = () => {
          setPermission(status.state);
        };
      });
    } else {
      // Fallback for older browsers: poll for changes.
      const interval = setInterval(() => {
        setPermission(Notification.permission);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []); // Empty dependency array ensures this runs only once.

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'認証中...'}</p>
      </div>
    );
  }

  // ログイン済み && 通知未許可 && 現在地がガードページでない -> ガードページへ
  if (user && permission !== 'granted' && location.pathname !== '/non-notification') {
    return <Navigate to="/non-notification" replace />;
  }

  // ログイン済み && 通知許可済み && 現在地がガードページ -> ホームページへ
  if (user && permission === 'granted' && location.pathname === '/non-notification') {
    return <Navigate to={user.is_teacher ? '/teacher' : '/'} replace />;
  }

  return <Outlet />;
};

// 管理者または教員かどうかをチェックするコンポーネント
const AdminOrTeacherRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  if (user && (user.is_admin || user.is_teacher)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-[80dvh]">
      <p className="text-xl">{'閲覧権限がありません'}</p>
    </div>
  );
};

function App() {
  const [notification, setNotification] = useState<{ title: string; body: string; link?: string } | null>(null);
  const navigate = useNavigate();

  // Firebase Cloud Messaging の設定
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = `/firebase-messaging-sw.js`;
      navigator.serviceWorker.register(swUrl).catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
      if (payload.data?.type === 'default_notification') {
        setNotification({
          title: payload.data.originalTitle || 'New Message',
          body: payload.data.originalBody || '',
          link: payload.data.link
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = () => {
    if (notification?.link) {
      navigate(notification.link);
    }
    setNotification(null);
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-[100dvh]">
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-white p-4 rounded-lg shadow-lg cursor-pointer z-50" onClick={handleNotificationClick}>
          <p className="font-bold">{notification.title}</p>
          <p>{notification.body}</p>
        </div>
      )}
      <Header />
      <main>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes (Login required) */}
          <Route element={<ProtectedRoute />}>
            {/* Notification Guard: Routes below require notification permission */}
            <Route element={<NotificationGuard />}>
              <Route path="/" element={<Index />} />
              <Route path="/otanoshimi" element={<Otanoshimi />} />
              <Route path="/otanoshimi-preview/:order" element={<OtanoshimiPreview />} />
              <Route path="/teacher" element={<TeacherIndex />} />
              <Route path="/teacher/roll-call-list" element={<TeacherRollCallList />} />
              <Route path="/call" element={<Call />} />
              <Route path="/teacher/call" element={<TeacherCall />} />
              <Route path="/credits" element={<Credits />} />
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
            </Route>
            {/* Page for users without notification permission */}
            <Route path="/non-notification" element={<NonNotification />} />
          </Route>

          {/* 404 Not Found */}
          <Route path="*" element={<Page404 />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

// Appをプロバイダーでラップする
const AppWrapper = () => (
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

export default AppWrapper;
