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

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-[#f7f4e5]">
          <Header isTeacher={isTeacher} />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Index isTeacher={isTeacher} />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin-sha256" element={<SHA256 />} />
              <Route path="/otanoshimi" element={<Otanoshimi />} />
              <Route path="/teacher-index" element={<TeacherIndex />} />
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
