type Props = {
  name: string;
};

const OtanoshimiCard = (props: Props) => {
  return (
    <div className="text-[120%] px-[0.5dvw] py-[1dvh] min-w-[7dvw] w-full min-h-[10dvh] h-full rounded-xl text-white text-center bg-gray-400 border-2 border-gray-500 flex items-center justify-center">
      <p>{props.name}</p>
    </div>
  );
};

export default OtanoshimiCard;
