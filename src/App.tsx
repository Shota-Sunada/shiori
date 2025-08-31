import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import UserAdmin from './pages/UserAdmin'; // UserAdmin をインポート
import Header from './components/Header';
import Footer from './components/Footer';
import Page404 from './pages/Page404';
import Otanoshimi from './pages/Otanoshimi';
import TeacherIndex from './pages/TeacherIndex';
// import { useEffect, useState } from 'react';
import { useEffect } from 'react';
import SHA256 from './pages/SHA256';
import TeacherCall from './pages/TeacherCall';
import Call from './pages/Call';
import { onMessage } from 'firebase/messaging';
import { messaging, registerFCMToken } from './firebase'; // registerFCMToken をインポート
import { useAuth } from './auth-context'; // useAuth をインポート

function App() {
  // const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const isTeacher = false;

  // Removed Firebase authentication useEffect
  // useEffect(() => {
  //   const auth = getAuth();
  //   const unsubscribe = auth.onAuthStateChanged(async (user) => {
  //     if (user && user.email) {
  //       const beforeAt = user.email.split('@')[0];
  //       const hash = await sha256(beforeAt);

  //       setIsTeacher(TEACHER_HASH === hash);
  //     } else {
  //       setIsTeacher(false);
  //     }
  //   });
  //   return () => unsubscribe();
  // }, []);

  const { user } = useAuth(); // useAuth フックを使用

  // Handle foreground messages and register FCM token
  useEffect(() => {
    // FCMトークン登録
    if (user && user.userId) {
      registerFCMToken(user.userId);
    }

    // フォアグラウンドメッセージの処理
    onMessage(messaging, (payload) => {
      // You can handle foreground messages here.
      // For example, showing an in-app notification or updating the UI.
      console.log('Foreground message received: ', payload);
      // The line below was commented out to prevent duplicate notifications.
      // new Notification(payload.notification?.title || '', { body: payload.notification?.body });
    });
  }, [user]); // user の変更を監視

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-[100dvh]">
          <Header isTeacher={isTeacher} />
          <main>
            <Routes>
              <Route path="/" element={<Index isTeacher={isTeacher} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/user-admin" element={<UserAdmin />} />
              <Route path="/admin-sha256" element={<SHA256 />} />
              <Route path="/otanoshimi" element={<Otanoshimi />} />
              <Route path="/teacher-index" element={<TeacherIndex />} />
              <Route path="/call" element={<Call />} />
              <Route path="/teacher-call" element={<TeacherCall />} />
              <Route path="*" element={<Page404 />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
