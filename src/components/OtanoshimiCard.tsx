import { useNavigate, useLocation } from 'react-router-dom';

type Props = {
  name: string;
  index: number;
};

const OtanoshimiCard = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const onActivate = () => {
    // 既存のURLパラメータ利用を維持しつつ、ページ内でローカルステート更新用にカスタムイベントを発火
    // (SSR や共有URLのため初回遷移は従来通り動作)
    if (location.pathname === '/otanoshimi') {
      window.dispatchEvent(new CustomEvent('otanoshimi:openPreview', { detail: { order: props.index } }));
    } else {
      navigate(`/otanoshimi?preview=${props.index}`);
    }
  };

  return (
    <button
      type="button"
      aria-label={`${props.index}番目 ${props.name} の詳細を開く`}
      onClick={onActivate}
      className="group relative w-full min-h-[10dvh] h-full rounded-2xl text-white text-center
                 bg-gradient-to-br from-slate-700 to-slate-500
                 border border-white/10 shadow-lg
                 flex items-center justify-center px-[1dvw] py-[1.2dvh]
                 transition-all duration-200 ease-out
                 hover:shadow-xl hover:scale-[1.015]
                 active:scale-[0.99]
                 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-400/40">
      {/* <span
        className="absolute left-2 top-2 select-none text-xs font-semibold
                   bg-white/90 text-slate-800 rounded-full px-2 py-0.5 shadow-sm"
        aria-hidden="true">
        {props.index}
      </span> */}

      <span className="text-[120%] font-semibold drop-shadow-sm px-2" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {props.name}
      </span>
    </button>
  );
};

export default OtanoshimiCard;
