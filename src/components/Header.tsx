import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';

// ハンバーガーアイコン
const HamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="flex flex-col justify-center items-center w-8 h-8 cursor-pointer">
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded my-1 transition-all duration-200 ${open ? 'opacity-0' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
  </div>
);

const Header = (props: { isTeacher: boolean }) => {
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const handleLogout = async () => {
    if (!window.confirm('本当にログアウトしますか？')) return;
    alert('ログアウトしました。');
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <div className={`bg-[#50141c] text-white flex flex-row items-center justify-between relative z-50`}>
        <img
          className={`p-[10px] w-[60px] md:w-[80px] ${user ? 'cursor-pointer' : 'cursor-default'}`}
          src="https://www.shudo-h.ed.jp/portal_assets/images/logo.png"
          alt=""
          onClick={
            user
              ? () => {
                  if (props.isTeacher) {
                    navigate('/teacher-index');
                  } else {
                    navigate('/');
                  }
                }
              : undefined
          }
        />
        <div className="mx-2 flex flex-col">
          <p className="font-bold text-base md:text-lg lg:text-xl leading-tight">{'修道高校79回生'}</p>
          <p className="text-sm md:text-base lg:text-lg leading-tight">{'修学旅行のしおり'}</p>
        </div>
        {user && (
          <div className="relative mx-2">
            <div onClick={() => setIsMenuOpen(!isMenuOpen)} ref={hamburgerRef}>
              <HamburgerIcon open={isMenuOpen} />
            </div>
            {isMenuOpen && (
              <div ref={menuRef} className="absolute right-0 top-full mt-2 bg-white text-black rounded shadow-lg w-40 z-50 flex flex-col border">
                <button
                  className="text-left px-4 py-3 hover:bg-gray-100 border-b cursor-pointer"
                  onClick={() => {
                    setIsMenuOpen(false);
                    if (props.isTeacher) {
                      navigate('/teacher-index');
                    } else {
                      navigate('/');
                    }
                  }}>
                  {'ホーム'}
                </button>
                <button
                  className="text-left px-4 py-3 hover:bg-gray-100 border-b cursor-pointer"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/otanoshimi');
                  }}>
                  {'お楽しみ会'}
                </button>
                <button
                  className="text-left px-4 py-3 hover:bg-gray-100 border-b cursor-pointer"
                  onClick={() => {
                    setIsMenuOpen(false);
                    navigate('/admin');
                  }}>
                  <p>{'管理パネル'}</p>
                  <p className="text-sm">{'※管理者専用'}</p>
                </button>
                <button
                  className="text-left px-4 py-3 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }}>
                  {'ログアウト'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* モーダルはApp.tsxで表示 */}
    </div>
  );
};

export default Header;