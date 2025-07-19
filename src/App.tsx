import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Login from './pages/Login';

function App() {
  return (
    <>
      <main>
        <div className="h-[100%] bg-[#f7f4e5] overflow-y-auto">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
            </Routes>
          </BrowserRouter>
        </div>
      </main>
    </>
  );
}

export default App;
