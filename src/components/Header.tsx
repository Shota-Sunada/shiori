import { useState, useEffect, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import YesNoModal from './YesNoModal';

const Header = ({ onLogoutModalChange, setLogoutModal }: { onLogoutModalChange?: (shown: boolean) => void; setLogoutModal?: (modal: JSX.Element | null) => void }) => {
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutModalShown, setIsLogoutModalShown] = useState(false);

  const navigate = useNavigate();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleLogout = async () => {
    alert('ログアウトしました。');
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (onLogoutModalChange) {
      onLogoutModalChange(isLogoutModalShown);
    }
    if (setLogoutModal) {
      if (isLogoutModalShown) {
        setLogoutModal(
          <YesNoModal
            yes={() => {
              handleLogout();
              setIsLogoutModalShown(false);
            }}
            no={() => {
              setIsLogoutModalShown(false);
            }}
            message={'ログアウトしてもよろしいですか?'}
          />
        );
      } else {
        setLogoutModal(null);
      }
    }
  }, [isLogoutModalShown, onLogoutModalChange, setLogoutModal, handleLogout]);

  if (user) {
    return (
      <div className="relative">
        <div className={`bg-[#50141c] text-white flex flex-row items-center justify-center relative z-50 ${isLogoutModalShown ? 'pointer-events-none select-none' : ''}`}>
          <img className="p-[10px]" width={100} src="https://www.shudo-h.ed.jp/portal_assets/images/logo.png" alt="" />
          <p>{'修道高校79回生 黄色バッチ 修学旅行のしおり'}</p>
          <div onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {'メニュー'}
            {isMenuOpen && (
              <div>
                <p onClick={() => navigate('/')}>{'メイン画面'}</p>
                <p onClick={() => navigate('/admin')}>{'管理画面'}</p>
              </div>
            )}
          </div>
          <button onClick={() => setIsLogoutModalShown(true)}>{'ログアウト'}</button>
        </div>
        {/* モーダルはApp.tsxで表示 */}
      </div>
    );
  }
};

export default Header;
