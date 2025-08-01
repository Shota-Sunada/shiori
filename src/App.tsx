import { useState, type JSX } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Header from './components/Header';
import Page404 from './pages/Page404';

function App() {
  const [isLogoutModalShown, setIsLogoutModalShown] = useState(false);
  const [logoutModal, setLogoutModal] = useState<JSX.Element | null>(null);

  return (
    <>
      <main>
        <div className="h-[100%] bg-[#f7f4e5] overflow-y-auto relative">
          <AuthProvider>
            <BrowserRouter>
              <div className={isLogoutModalShown ? 'blur-sm pointer-events-none select-none' : ''}>
                <Header onLogoutModalChange={setIsLogoutModalShown} setLogoutModal={setLogoutModal} />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<Page404 />} />
                </Routes>
              </div>
              {logoutModal}
            </BrowserRouter>
          </AuthProvider>
        </div>
      </main>
    </>
  );
}

export default App;
