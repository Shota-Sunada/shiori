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
  const closeTimerRef = useRef<number | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(() => (typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false));

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
      // 既存タイマーがあればクリア
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      // セーフティ: onAnimationEnd が拾えない環境向けのアンマウント保険
      const t = window.setTimeout(() => {
        setMenuVisible(false);
        setMenuClosing(false);
        closeTimerRef.current = null;
      }, 220);
      closeTimerRef.current = t;
      return () => {
        if (t) window.clearTimeout(t);
      };
    }
  }, [isMenuOpen, menuVisible, menuClosing]);

  // 画面幅の監視（モバイル判定）
  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return;
    const mq = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mq.matches);
    const mql = mq as unknown as {
      addEventListener?: (type: 'change', listener: EventListener) => void;
      removeEventListener?: (type: 'change', listener: EventListener) => void;
      addListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (ev: MediaQueryListEvent) => void) => void;
      matches: boolean;
    };
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange as unknown as EventListener);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(onChange as unknown as (ev: MediaQueryListEvent) => void);
    }
    onChange();
    return () => {
      if (typeof mql.removeEventListener === 'function') {
        mql.removeEventListener('change', onChange as unknown as EventListener);
      } else if (typeof mql.removeListener === 'function') {
        mql.removeListener(onChange as unknown as (ev: MediaQueryListEvent) => void);
      }
    };
  }, []);

  // モバイルでメニューオープン中は背景スクロールをロック
  useEffect(() => {
    if (!isMobile) return;
    const el = document.documentElement as HTMLElement;
    const prev = el.style.overflow;
    if (isMenuOpen && menuVisible && !menuClosing) {
      el.style.overflow = 'hidden';
    } else {
      el.style.overflow = prev || '';
    }
    return () => {
      el.style.overflow = '';
    };
  }, [isMobile, isMenuOpen, menuVisible, menuClosing]);

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
        label: 'お楽しみ会',
        prefetchKey: 'otanoshimiTeams',
        fetcher: async () => otanoshimiApi.list()
      },
      { type: 'action', label: 'リロード', onClick: () => window.location.reload() },
      { type: 'link', to: '/env-debug', label: '動作環境表示' },
      { type: 'link', to: '/credits', label: 'クレジット' },
      { type: 'link', to: '/admin', label: '管理パネル', only_admin: true },
      { type: 'link', to: '/user-admin', label: 'ユーザー管理', only_admin: true },
      { type: 'link', to: '/otanoshimi-admin', label: 'お楽しみ会管理', only_admin: true },
      { type: 'link', to: '/teacher-admin', label: '先生管理', only_admin: true },
      { type: 'link', to: '/admin/schedules', label: 'スケジュール管理', only_admin: true }
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
            {menuVisible &&
              (isMobile ? (
                // モバイル: 全画面オーバーレイ + スクロール
                <div
                  ref={menuRef}
                  data-state={menuClosing ? 'closing' : 'open'}
                  role="dialog"
                  aria-modal="true"
                  id="header-menu"
                  aria-hidden={menuClosing ? 'true' : undefined}
                  {...(menuClosing ? { inert: true } : {})}
                  className={`fixed inset-0 bg-white text-black z-50 flex flex-col header-menu-anim-container ${menuClosing ? 'header-menu-anim-out' : 'header-menu-anim-in'}`}
                  onAnimationEnd={(e) => {
                    if (menuClosing && typeof e.animationName === 'string' && e.animationName.includes('headerMenuOut')) {
                      setMenuVisible(false);
                      setMenuClosing(false);
                      if (closeTimerRef.current) {
                        window.clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                    }
                  }}>
                  <div className="flex items-center justify-between px-4 py-3 border-b">
                    <div className="flex items-center gap-2">
                      <img className="w-8 h-8" src="/icon.png" alt="" />
                      <span className="font-semibold">メニュー</span>
                    </div>
                    <button className="px-3 py-1 rounded bg-gray-100" onClick={closeMenu} aria-label="閉じる">
                      閉じる
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <div className="flex flex-col divide-y">
                      {menuItems.map((item, i) =>
                        user.is_admin || user.is_teacher || !item.only_admin ? (
                          item.type === 'link' ? (
                            item.prefetchKey && item.fetcher ? (
                              <PrefetchLink key={i} to={item.to} prefetchKey={item.prefetchKey} fetcher={item.fetcher} className="px-4 py-4 text-lg hover:bg-gray-50" onClick={closeMenu}>
                                <p>{item.label}</p>
                                {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                              </PrefetchLink>
                            ) : (
                              <Link key={i} to={item.to} className="px-4 py-4 text-lg hover:bg-gray-50" onClick={closeMenu}>
                                <p>{item.label}</p>
                                {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                              </Link>
                            )
                          ) : (
                            <button
                              key={i}
                              className="px-4 py-4 text-left text-lg hover:bg-gray-50"
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
                        className="px-4 py-4 text-left text-lg hover:bg-red-50 text-red-600"
                        onClick={() => {
                          closeMenu();
                          handleLogout();
                        }}>
                        {'ログアウト'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // デスクトップ: これまで通りのドロップダウン
                <div
                  ref={menuRef}
                  data-state={menuClosing ? 'closing' : 'open'}
                  role="menu"
                  id="header-menu"
                  aria-hidden={menuClosing ? 'true' : undefined}
                  {...(menuClosing ? { inert: true } : {})}
                  className={`absolute right-0 top-full mt-2 bg-white text-black rounded shadow-lg w-52 z-50 flex flex-col border divide-y header-menu-anim-container overflow-hidden ${
                    menuClosing ? 'header-menu-anim-out' : 'header-menu-anim-in'
                  }`}
                  style={{ transformOrigin: '100% 0%' }}
                  onAnimationEnd={(e) => {
                    if (menuClosing && typeof e.animationName === 'string' && e.animationName.includes('headerMenuOut')) {
                      setMenuVisible(false);
                      setMenuClosing(false);
                      if (closeTimerRef.current) {
                        window.clearTimeout(closeTimerRef.current);
                        closeTimerRef.current = null;
                      }
                    }
                  }}>
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
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
