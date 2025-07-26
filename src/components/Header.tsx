import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigate = useNavigate();

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
      </div>
    </div>
  );
};

export default Header;
