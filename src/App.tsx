import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Header from './components/Header';
import Footer from './components/Footer';
import Page404 from './pages/Page404';
import Otanoshimi from './pages/Otanoshimi';
import TeacherIndex from './pages/TeacherIndex';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { TEACHER_HASH } from './accounts';
import { sha256 } from './sha256';
import SHA256 from './pages/SHA256';
import TeacherCall from './pages/TeacherCall';
import Call from './pages/Call';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from './firebase';

function App() {
  const [isTeacher, setIsTeacher] = useState<boolean>(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        const beforeAt = user.email.split('@')[0];
        const hash = await sha256(beforeAt);

        setIsTeacher(TEACHER_HASH === hash);
      } else {
        setIsTeacher(false);
      }
    });
    return () => unsubscribe();
  });

    useEffect(() => {
    const requestPermission = async () => {
      try {
        // ルートのJSファイルを登録
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          type: 'module',
          scope: '/',
        });

        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: registration,
        });

        if (token) {
          console.log('Token generated:', token);
        } else {
          console.log('No registration token available.');
        }
      } catch (err) {
        console.error('Error getting token:', err);
      }
    };

    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        requestPermission();
      } else {
        console.log('Unable to get permission to notify.');
      }
    });
  }, []);

    useEffect(() => {
      onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // Customize notification here
        // You can display a toast or update the UI
        const notificationTitle = payload.notification?.title;
        const notificationOptions = {
          body: payload.notification?.body,
          icon: payload.notification?.icon,
        };
  
        if (notificationTitle) {
          new Notification(notificationTitle, notificationOptions);
        }
      });
    }, []);

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
