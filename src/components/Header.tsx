import { useState, useEffect, useRef, useCallback, useMemo, type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { clearShioriCache } from '../helpers/clearShioriCache';
import { PrefetchLink } from '../prefetch/PrefetchLink';
import { otanoshimiApi } from '../helpers/domainApi';
import { IoHome, IoReload, IoLogOut, IoSettingsSharp, IoSend } from 'react-icons/io5';
import { FaTable } from 'react-icons/fa';
import { LuPartyPopper } from 'react-icons/lu';
import { VscDebugAlt } from 'react-icons/vsc';
import { FaUserGraduate } from 'react-icons/fa6';
import { TbTrain } from 'react-icons/tb';
import { MdAirlineSeatReclineNormal, MdOutlineMessage } from 'react-icons/md';
import { PiBagFill } from 'react-icons/pi';
import { FaListCheck } from 'react-icons/fa6';

const HamburgerIcon = ({ open }: { open: boolean }) => (
  <div className="flex flex-col justify-center items-center w-8 h-8 cursor-pointer">
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? 'rotate-45 translate-y-2' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded my-1 transition-all duration-200 ${open ? 'opacity-0' : ''}`}></span>
    <span className={`block h-1 w-6 bg-white rounded transition-all duration-200 ${open ? '-rotate-45 -translate-y-2' : ''}`}></span>
  </div>
);

interface HeaderProps {
  menuBgColor?: string;
}

const Header = ({ menuBgColor = 'bg-white' }: HeaderProps) => {
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
    | {
        type: 'link';
        icon?: ReactElement;
        to: string;
        label: string;
        note?: string;
        prefetchKey?: import('../prefetch/cache').PrefetchKey;
        fetcher?: () => Promise<unknown>;
        only_admin?: boolean;
        bgColor?: 'blue' | 'green' | 'white' | 'red' | 'yellow' | 'purple' | 'light_blue' | 'light_green' | 'pink' | 'light_yellow';
      }
    | {
        type: 'action';
        icon?: ReactElement;
        label: string;
        onClick: () => void;
        only_admin?: boolean;
        bgColor?: 'blue' | 'green' | 'white' | 'red' | 'yellow' | 'purple' | 'light_blue' | 'light_green' | 'pink' | 'light_yellow';
      };
  const menuItems: MenuItem[] = useMemo(
    () => [
      { type: 'link', icon: <IoHome />, to: user?.is_teacher ? '/teacher' : '/', label: 'ホーム' },
      { type: 'link', icon: <FaTable />, to: '/yotei', label: '行程表' },
      { type: 'link', icon: <MdOutlineMessage />, to: '/messages', label: 'メッセージ' },
      { type: 'link', icon: <IoSend />, to: '/teacher/messages', label: 'メッセージを送信', note: '先生専用', only_admin: true },
      { type: 'link', icon: <PiBagFill />, to: '/goods', label: '持ち物' },
      { type: 'link', icon: <FaListCheck />, to: '/goods-check', label: '持ち物チェッカー' },
      { type: 'link', icon: <TbTrain />, to: '/shinkansen', label: '新幹線' },
      { type: 'link', icon: <MdAirlineSeatReclineNormal />, to: '/shinkansen/floor', label: '新幹線座席一覧' },
      { type: 'link', icon: <LuPartyPopper />, to: '/otanoshimi', label: 'お楽しみ会', prefetchKey: 'otanoshimiTeams', fetcher: async () => otanoshimiApi.list() },
      { type: 'link', icon: <FaUserGraduate />, to: '/credits', label: 'クレジット' },
      {
        type: 'action',
        icon: <IoReload />,
        label: 'しおりを再読み込み',
        onClick: () => {
          clearShioriCache();
          window.location.reload();
        }
      },
      { type: 'link', icon: <VscDebugAlt />, to: '/env-debug', label: 'デバッグ用環境表示' },
      { type: 'link', icon: <IoSettingsSharp />, to: '/admin/students', label: '生徒管理画面', note: '管理者&先生専用', only_admin: true },
      { type: 'link', icon: <IoSettingsSharp />, to: '/admin/teachers', label: '先生管理画面', note: '管理者&先生専用', only_admin: true },
      { type: 'link', icon: <IoSettingsSharp />, to: '/admin/users', label: 'ユーザー管理画面', note: '管理者&先生専用', only_admin: true },
      { type: 'link', icon: <IoSettingsSharp />, to: '/admin/otanoshimi', label: 'お楽しみ会管理画面', note: '管理者&先生専用', only_admin: true },
      { type: 'link', icon: <IoSettingsSharp />, to: '/admin/schedules', label: 'スケジュール管理画面', note: '管理者&先生専用', only_admin: true }
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
                  className={`fixed top-0 right-0 h-full w-72 max-w-full text-black z-[1100] flex flex-col shadow-xl transition-transform duration-300 ease-in-out overflow-y-auto max-h-screen ${menuBgColor} ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
                  style={{ willChange: 'transform' }}>
                  <button className="self-end m-4 px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold" onClick={closeMenu} aria-label="閉じる">
                    × 閉じる
                  </button>
                  <nav className="flex-1 flex flex-col divide-y">
                    {menuItems.map((item, i) => {
                      if (!(user.is_admin || user.is_teacher || !item.only_admin)) return <></>;
                      // 色名→Tailwindクラス変換
                      const colorMap: Record<string, { base: string; hover: string }> = {
                        blue: { base: 'bg-blue-100 text-blue-900', hover: 'hover:bg-blue-50' },
                        green: { base: 'bg-green-100 text-green-900', hover: 'hover:bg-green-50' },
                        white: { base: 'bg-white text-gray-900', hover: 'hover:bg-gray-100' },
                        red: { base: 'bg-red-100 text-red-900', hover: 'hover:bg-red-50' },
                        yellow: { base: 'bg-yellow-100 text-yellow-900', hover: 'hover:bg-yellow-50' },
                        purple: { base: 'bg-purple-100 text-purple-900', hover: 'hover:bg-purple-50' },
                        light_blue: { base: 'bg-blue-50 text-blue-900', hover: 'hover:bg-blue-100' },
                        light_green: { base: 'bg-green-50 text-green-900', hover: 'hover:bg-green-100' },
                        pink: { base: 'bg-pink-100 text-pink-900', hover: 'hover:bg-pink-50' },
                        light_yellow: { base: 'bg-yellow-50 text-yellow-900', hover: 'hover:bg-yellow-100' }
                      };
                      const color = item.bgColor && colorMap[item.bgColor] ? colorMap[item.bgColor] : { base: '', hover: 'hover:bg-gray-100' };
                      const itemClass = `header-menu-item text-left px-4 py-3 cursor-pointer ${color.base} ${color.hover}`;
                      if (item.type === 'link') {
                        if (item.prefetchKey && item.fetcher) {
                          return (
                            <PrefetchLink
                              key={i}
                              to={item.to}
                              prefetchKey={item.prefetchKey}
                              fetcher={item.fetcher}
                              className={`${itemClass} flex flex-row items-center justify-start`}
                              onClick={closeMenu}>
                              {item.icon}
                              <p className="ml-2">{item.label}</p>
                              {item.note && <p className="text-xs text-gray-500">{item.note}</p>}
                            </PrefetchLink>
                          );
                        } else {
                          return (
                            <Link key={i} to={item.to} className={`${itemClass} flex flex-col items-start justify-start`} onClick={closeMenu}>
                              <div className="flex flex-row items-center justify-start">
                                {item.icon}
                                <p className="ml-2">{item.label}</p>
                              </div>
                              {item.note && <p className="ml-3 text-xs text-gray-500">{item.note}</p>}
                            </Link>
                          );
                        }
                      } else {
                        return (
                          <button
                            key={i}
                            className={`${itemClass} flex flex-col items-start justify-start`}
                            onClick={() => {
                              item.onClick?.();
                              closeMenu();
                            }}>
                            <div className="flex flex-row items-center justify-start">
                              {item.icon}
                              <p className="ml-2">{item.label}</p>
                            </div>
                          </button>
                        );
                      }
                    })}
                    <button
                      className="header-menu-item text-left px-4 py-3 hover:bg-red-600 bg-red-500 text-white cursor-pointer"
                      onClick={() => {
                        closeMenu();
                        handleLogout();
                      }}>
                      <div className="flex flex-row items-center justify-start">
                        <IoLogOut />
                        <p className="ml-2">{'ログアウト'}</p>
                      </div>
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
