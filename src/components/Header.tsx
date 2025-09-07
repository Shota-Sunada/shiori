import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { handleEnableNotifications } from '../helpers/notifications';
import { PrefetchLink } from '../prefetch/PrefetchLink';

const HamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="flex flex-col justify-center items-center w-8 h-8 cursor-pointer">
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded my-1 transition-all duration-200 ${open ? 'opacity-0' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
  </div>
);

const Header = () => {
  const { user, logout } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    if (!window.confirm('本当にログアウトしますか？')) return;
    alert('ログアウトしました。');
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMenuOpen) return;
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  type MenuItem =
    | { type: 'link'; to: string; label: string; note?: string; prefetchKey?: import('../prefetch/cache').PrefetchKey; fetcher?: () => Promise<unknown> }
    | { type: 'action'; label: string; onClick: () => void };
  const menuItems: MenuItem[] = useMemo(
    () => [
      {
        type: 'link',
        to: user?.is_teacher ? '/teacher' : '/',
        label: 'ホーム'
      },
      {
        type: 'link',
        to: '/otanoshimi',
        label: 'お楽しみ会',
        prefetchKey: 'otanoshimiTeams',
        fetcher: async () => {
          const res = await fetch('/api/otanoshimi');
          if (!res.ok) throw new Error('otanoshimi fetch failed');
          const data = await res.json();
          // ページ側と同じ整形をここでは行わず raw をキャッシュ
          return data;
        }
      },
      { type: 'action', label: '通知を有効にする', onClick: () => handleEnableNotifications(user) },
      { type: 'link', to: '/admin', label: '管理パネル', note: '※管理者専用' },
      { type: 'link', to: '/user-admin', label: 'ユーザー管理', note: '※管理者専用' },
      { type: 'link', to: '/otanoshimi-admin', label: 'お楽しみ会管理', note: '※管理者専用' },
      { type: 'link', to: '/teacher-admin', label: '先生管理', note: '※管理者専用' },
      { type: 'link', to: '/credits', label: 'クレジット' }
    ],
    [user]
  );

  return (
    <div className="sticky top-0 z-40">
      <div className={`bg-[#50141c] text-white flex flex-row items-center justify-between relative z-50`}>
        <Link to={user?.is_teacher ? '/teacher' : '/'}>
          <img className={`p-[10px] w-[60px] md:w-[80px] ${user ? 'cursor-pointer' : 'cursor-default'}`} src="https://www.shudo-h.ed.jp/portal_assets/images/logo.png" alt="" />
        </Link>
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
              <div ref={menuRef} className="absolute right-0 top-full mt-2 bg-white text-black rounded shadow-lg w-52 z-50 flex flex-col border divide-y">
                {menuItems.map((item, i) =>
                  item.type === 'link' ? (
                    item.prefetchKey && item.fetcher ? (
                      <PrefetchLink key={i} to={item.to} prefetchKey={item.prefetchKey} fetcher={item.fetcher} className="text-left px-4 py-3 hover:bg-gray-100 cursor-pointer" onClick={closeMenu}>
                        <p>{item.label}</p>
                        {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                      </PrefetchLink>
                    ) : (
                      <Link key={i} to={item.to} className="text-left px-4 py-3 hover:bg-gray-100 cursor-pointer" onClick={closeMenu}>
                        <p>{item.label}</p>
                        {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                      </Link>
                    )
                  ) : (
                    <button
                      key={i}
                      className="text-left px-4 py-3 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        item.onClick?.();
                        closeMenu();
                      }}>
                      {item.label}
                    </button>
                  )
                )}
                <button
                  className="text-left px-4 py-3 hover:bg-red-50 text-red-600 cursor-pointer"
                  onClick={() => {
                    closeMenu();
                    handleLogout();
                  }}>
                  {'ログアウト'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
