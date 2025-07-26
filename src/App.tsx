import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth-context';
import Index from './pages/Index';
import Login from './pages/Login';
import Admin from './pages/Admin';
import Header from './components/Header';

function App() {
  return (
    <>
      <main>
        <div className="h-[100%] bg-[#f7f4e5] overflow-y-auto">
          <AuthProvider>
            <Header />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </div>
      </main>
    </>
  );
}

export default App;
