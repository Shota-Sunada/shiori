import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

const Index = () => {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) return null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>{'ようこそ、修学旅行のしおりへ！'}</p>
      <button onClick={handleLogout}>ログアウト</button>
      {/* 必要に応じて他のコンテンツを追加 */}
    </div>
  );
};

export default Index;
