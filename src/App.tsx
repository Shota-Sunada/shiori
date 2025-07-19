import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';

function App() {
  return (
    <>
      <main>
        <div className="h-[100%] bg-[#f7f4e5] overflow-y-auto">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
            </Routes>
          </BrowserRouter>
        </div>
      </main>
    </>
  );
}

export default App;
