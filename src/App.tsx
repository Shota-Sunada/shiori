import { BrowserRouter, Route, Routes } from 'react-router-dom';
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
import SHA256 from './pages/SHA256';
import TeacherCall from './pages/TeacherCall';
import Call from './pages/Call';
import { onMessage } from 'firebase/messaging';
import { messaging, registerFCMToken } from './firebase';

const AdminOrTeacherRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'認証中...'}</p>
      </div>
    );
  }

  if (user && (user.is_admin || user.is_teacher)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-[80dvh]">
      <p className="text-xl">{'閲覧権限がありません'}</p>
    </div>
  );
};

function Main() {
  const { user } = useAuth();
  const [isTeacher, setIsTeacher] = useState<boolean>(false);

  useEffect(() => {
    setIsTeacher(user?.is_teacher ?? false);
  }, [user]);

  useEffect(() => {
    if (user && user.userId) {
      registerFCMToken(user.userId);
    }

    onMessage(messaging, (payload) => {
      console.log('Foreground message received: ', payload);
    });
  }, [user]);

  return (
    <BrowserRouter>
      <div className="grid grid-rows-[auto_1fr_auto] bg-[#f7f4e5] min-h-[100dvh]">
        <Header isTeacher={isTeacher} />
        <main>
          <Routes>
            <Route path="/" element={<Index isTeacher={isTeacher} />} />
            <Route path="/login" element={<Login />} />
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
  );
}

function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  );
}

export default App;
