import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Header from './components/Header';
import Page404 from './pages/Page404';

function App() {
  return (
    <>
      <main>
        <div className="h-[100%] bg-[#f7f4e5] overflow-y-auto">
          <AuthProvider>
            <BrowserRouter>
              <Header />
              <Routes>
                <Route path="/" element={<Index  />} />
                <Route path="/login" element={<Login  />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Page404 />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </div>
      </main>
    </>
  );
}

export default App;
