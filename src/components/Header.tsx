import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

const Header = () => {
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (user) {
    return (
      <div>
        <p>{'修道高校79回生 黄色バッチ'}</p>
        <p>{'修学旅行のしおり'}</p>
        <div onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {'メニュー'}
          {isMenuOpen && (
            <div>
              <p onClick={() => navigate('/')}>{'メイン画面'}</p>
              <p onClick={() => navigate('/admin')}>{'管理画面'}</p>
            </div>
          )}
          <button onClick={handleLogout}>{'ログアウト'}</button>
        </div>
      </div>
    );
  }
};

export default Header;
