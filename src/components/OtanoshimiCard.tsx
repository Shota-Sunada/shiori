import { useNavigate, useLocation } from 'react-router-dom';

type Props = {
  name: string;
  index: number;
};

const OtanoshimiCard = (props: Props) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="text-[120%] px-[0.5dvw] py-[1dvh] w-full min-h-[10dvh] h-full rounded-xl text-white text-center bg-gray-400 border-2 border-gray-500 flex items-center justify-center cursor-pointer"
      onClick={() => {
        // 既存のURLパラメータ利用を維持しつつ、ページ内でローカルステート更新用にカスタムイベントを発火
        // (SSR や共有URLのため初回遷移は従来通り動作)
        if (location.pathname === '/otanoshimi') {
          window.dispatchEvent(new CustomEvent('otanoshimi:openPreview', { detail: { order: props.index } }));
        } else {
          navigate(`/otanoshimi?preview=${props.index}`);
        }
      }}>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>{props.name}</p>
    </div>
  );
};

export default OtanoshimiCard;
