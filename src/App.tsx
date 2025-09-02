import { BrowserRouter, Route, Routes, Navigate, Outlet } from 'react-router-dom';
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
import { useEffect, type ReactNode } from 'react';
import TeacherCall from './pages/TeacherCall';
import Call from './pages/Call';
import OtanoshimiAdmin from './pages/OtanoshimiAdmin';
import { onMessage } from 'firebase/messaging';
import { messaging, registerFCMToken } from './firebase';
import OtanoshimiPreview from './pages/OtanoshimiPreview';

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
  const { user } = useAuth();

  // Firebase Cloud Messaging の設定
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const swUrl = `/firebase-messaging-sw.js`;
      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          console.log('Service Worker registered successfully:', registration);
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
        });
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
      if (payload.data) {
        const { type, originalTitle, originalBody } = payload.data;
        if (type === 'default_notification') {
          alert(`[In-App Notification] ${originalTitle || 'New Message'}: ${originalBody || ''}`);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // ユーザーがログインしたらFCMトークンを登録
  useEffect(() => {
    if (user && user.userId) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          console.log('User logged in, attempting to register FCM token.');
          registerFCMToken(user.userId, registration);
        });
      }
    }
  }, [user]);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-[100dvh]">
      <Header />
      <main>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Index />} />
          <Route path="/otanoshimi" element={<Otanoshimi />} />
          <Route path="/otanoshimi-preview/:order" element={<OtanoshimiPreview />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/teacher-index" element={<TeacherIndex />} />
            <Route path="/call" element={<Call />} />
            <Route path="/teacher-call" element={<TeacherCall />} />
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