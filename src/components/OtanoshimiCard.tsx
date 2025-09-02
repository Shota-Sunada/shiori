import { useNavigate } from 'react-router-dom';

type Props = {
  name: string;
  index: number;
};

const OtanoshimiCard = (props: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className="text-[120%] px-[0.5dvw] py-[1dvh] max-w-[40dvw] w-full min-h-[10dvh] h-full rounded-xl text-white text-center bg-gray-400 border-2 border-gray-500 flex items-center justify-center cursor-pointer"
      onClick={() => navigate(`/otanoshimi-preview/${props.index}`)}>
      <p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
        {props.name}
      </p>
    </div>
  );
};

export default OtanoshimiCard;
