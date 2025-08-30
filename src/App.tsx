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
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState(Notification.permission);

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

  const getTokenForPush = async () => {
    try {
      const firebaseConfig = JSON.stringify({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
      });
      const swUrl = `/firebase-messaging-sw.js?firebaseConfig=${encodeURIComponent(firebaseConfig)}`;

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });

      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        // Token is available, send it to your server
      } else {
        console.log('No registration token available.');
      }
    } catch (err) {
      console.error('Error getting token:', err);
    }
  };

  const handleRequestPermission = () => {
    Notification.requestPermission().then((permission) => {
      setNotificationPermissionStatus(permission);
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        getTokenForPush();
      } else {
        console.log('Unable to get permission to notify.');
      }
    });
  };

  useEffect(() => {
    if (notificationPermissionStatus === 'granted') {
      getTokenForPush();
    }
  }, [notificationPermissionStatus]);

  useEffect(() => {
    onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
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
            {notificationPermissionStatus === 'default' && (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <button onClick={handleRequestPermission} style={{ padding: '0.5rem 1rem', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px' }}>
                  {"プッシュ通知を有効にする"}
                </button>
              </div>
            )}
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