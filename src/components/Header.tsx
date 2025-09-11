import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { PrefetchLink } from '../prefetch/PrefetchLink';
import { otanoshimiApi } from '../helpers/domainApi';

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
  // bodyスクロールロック用
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${window.scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    } else {
      const scrollY = -parseInt(document.body.style.top || '0', 10);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    }
    return () => {
      // クリーンアップ
      const scrollY = -parseInt(document.body.style.top || '0', 10);
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isMenuOpen]);

  // 不要な状態・副作用を削除し、isMenuOpenのみで制御

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    if (!window.confirm('本当にログアウトしますか？')) return;
    alert('ログアウトしました。');
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  // オーバーレイクリックで閉じる
  useEffect(() => {
    if (!isMenuOpen) return;
    const handle = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('header-menu-overlay')) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [isMenuOpen]);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  type MenuItem =
    | { type: 'link'; to: string; label: string; note?: string; prefetchKey?: import('../prefetch/cache').PrefetchKey; fetcher?: () => Promise<unknown>; only_admin?: boolean }
    | { type: 'action'; label: string; onClick: () => void; only_admin?: boolean };
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
        label: 'お楽しみ会ページ',
        prefetchKey: 'otanoshimiTeams',
        fetcher: async () => otanoshimiApi.list()
      },
      { type: 'action', label: 'しおりを再読み込み', onClick: () => window.location.reload() },
      { type: 'link', to: '/env-debug', label: 'デバッグ用環境表示' },
      { type: 'link', to: '/credits', label: 'クレジット' },
      { type: 'link', to: '/admin', label: '管理パネル', note: '※管理者専用', only_admin: true },
      { type: 'link', to: '/user-admin', label: 'ユーザー管理', note: '※管理者専用', only_admin: true },
      { type: 'link', to: '/otanoshimi-admin', label: 'お楽しみ会管理', note: '※管理者専用', only_admin: true },
      { type: 'link', to: '/teacher-admin', label: '先生管理', note: '※管理者専用', only_admin: true },
      { type: 'link', to: '/admin/schedules', label: 'スケジュール管理', note: '※管理者専用', only_admin: true }
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
            <button
              type="button"
              aria-label="メニュー"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls="header-menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              ref={hamburgerRef}
              className="hamburger-btn flex items-center justify-center">
              <HamburgerIcon open={isMenuOpen} />
            </button>
            {createPortal(
              <>
                {/* オーバーレイ */}
                <div
                  className={`header-menu-overlay fixed inset-0 bg-black/40 z-[1000] transition-opacity duration-200 ${isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  aria-hidden="true"
                  tabIndex={-1}
                />
                {/* メニュー本体 */}
                <div
                  ref={menuRef}
                  role="menu"
                  id="header-menu"
                  aria-hidden={!isMenuOpen ? 'true' : undefined}
                  className={`fixed top-0 right-0 h-full w-72 max-w-full bg-white text-black z-[1100] flex flex-col border-l shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto max-h-screen
                    ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}
                  `}
                  style={{ willChange: 'transform' }}>
                  <button className="self-end m-4 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold" onClick={closeMenu} aria-label="閉じる">
                    × 閉じる
                  </button>
                  <nav className="flex-1 flex flex-col divide-y">
                    {menuItems.map((item, i) =>
                      user.is_admin || user.is_teacher || !item.only_admin ? (
                        item.type === 'link' ? (
                          item.prefetchKey && item.fetcher ? (
                            <PrefetchLink
                              key={i}
                              to={item.to}
                              prefetchKey={item.prefetchKey}
                              fetcher={item.fetcher}
                              className="header-menu-item text-left px-4 py-3 hover:bg-gray-100 cursor-pointer"
                              onClick={closeMenu}>
                              <p>{item.label}</p>
                              {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                            </PrefetchLink>
                          ) : (
                            <Link key={i} to={item.to} className="header-menu-item text-left px-4 py-3 hover:bg-gray-100 cursor-pointer" onClick={closeMenu}>
                              <p>{item.label}</p>
                              {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                            </Link>
                          )
                        ) : (
                          <button
                            key={i}
                            className="header-menu-item text-left px-4 py-3 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              item.onClick?.();
                              closeMenu();
                            }}>
                            {item.label}
                          </button>
                        )
                      ) : (
                        <></>
                      )
                    )}
                    <button
                      className="header-menu-item text-left px-4 py-3 hover:bg-red-50 text-red-600 cursor-pointer"
                      onClick={() => {
                        closeMenu();
                        handleLogout();
                      }}>
                      {'ログアウト'}
                    </button>
                  </nav>
                </div>
              </>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
