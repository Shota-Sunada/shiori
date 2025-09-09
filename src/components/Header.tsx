import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);

  // 開: 表示即マウント + オープンアニメ, 閉: クローズアニメ後にアンマウント
  useEffect(() => {
    if (isMenuOpen) {
      // 開く: 可視化して closing 状態解除
      setMenuVisible(true);
      requestAnimationFrame(() => setMenuClosing(false));
    } else if (menuVisible && !menuClosing) {
      // 閉じ開始: closing フラグを立ててアニメ終了後にアンマウント
      setMenuClosing(true);
      // 閉じアニメ中に内部へフォーカスが残ると aria-hidden 警告になるので先にハンバーガーへフォーカスを戻す
      if (menuRef.current && menuRef.current.contains(document.activeElement)) {
        (hamburgerRef.current as HTMLButtonElement | null)?.focus();
      }
      const t = setTimeout(() => {
        setMenuVisible(false);
        setMenuClosing(false);
      }, 160); // CSS の 150ms + 余裕
      return () => clearTimeout(t);
    }
  }, [isMenuOpen, menuVisible, menuClosing]);

  const menuRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    if (!window.confirm('本当にログアウトしますか？')) return;
    alert('ログアウトしました。');
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (!isMenuOpen) return;
      const target = event.target as Node | null;
      if (!menuRef.current) return;
      const clickedInsideMenu = target && menuRef.current.contains(target);
      const clickedOnHamburger = hamburgerRef.current && target && hamburgerRef.current.contains(target);
      if (!clickedInsideMenu && !clickedOnHamburger) {
        setIsMenuOpen(false);
      }
    };

    // Use capture phase listeners so we detect taps before other handlers stop propagation (helps Safari)
    document.addEventListener('pointerdown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    // Also close on scroll to avoid stuck-open state when the page moves
    const scrollHandler = handleClickOutside as EventListener;
    window.addEventListener('scroll', scrollHandler, { capture: true, passive: true });

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('scroll', scrollHandler, { capture: true } as AddEventListenerOptions);
    };
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
        fetcher: async () => otanoshimiApi.list()
      },
      { type: 'action', label: 'リロード', onClick: () => window.location.reload() },
      { type: 'link', to: '/env-debug', label: '動作環境表示' },
      { type: 'link', to: '/credits', label: 'クレジット' },
      { type: 'link', to: '/admin', label: '管理パネル', note: '※管理者専用' },
      { type: 'link', to: '/user-admin', label: 'ユーザー管理', note: '※管理者専用' },
      { type: 'link', to: '/otanoshimi-admin', label: 'お楽しみ会管理', note: '※管理者専用' },
      { type: 'link', to: '/teacher-admin', label: '先生管理', note: '※管理者専用' }
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
            {menuVisible && (
              <div
                ref={menuRef}
                data-state={menuClosing ? 'closing' : 'open'}
                role="menu"
                id="header-menu"
                aria-hidden={menuClosing ? 'true' : undefined}
                // inert: 閉じアニメ中はフォーカス/操作不可 (対応ブラウザのみ)
                {...(menuClosing ? { inert: true } : {})}
                className={`absolute right-0 top-full mt-2 bg-white text-black rounded shadow-lg w-52 z-50 flex flex-col border divide-y header-menu-anim-container overflow-hidden ${
                  menuClosing ? 'header-menu-anim-out' : 'header-menu-anim-in'
                }`}
                style={{ transformOrigin: '100% 0%' }}>
                {menuItems.map((item, i) =>
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
                )}
                <button
                  className="header-menu-item text-left px-4 py-3 hover:bg-red-50 text-red-600 cursor-pointer"
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
