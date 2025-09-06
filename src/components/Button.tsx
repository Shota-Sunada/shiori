import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const Button = ({
  text,
  arrowRight,
  arrowLeft,
  onClick,
  link,
  color = 'blue'
}: {
  text: string;
  arrowRight?: boolean;
  arrowLeft?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  link?: string;
  color?: 'blue' | 'red' | "green" | "purple" | "gray";
}) => {
  const innerButton = () => (
    <div
      className={`mobiry-button-${color} text-align m-[10px] p-[8px] w-[200px] rounded-[20px] cursor-pointer text-white transition-[0.2s] font-[15px] flex flex-row items-center justify-center relative`}>
      <p className="font-medium">{text}</p>
      {arrowRight ? (
        <div className="absolute right-[6px] bg-white rounded-[50%] min-w-[28px] min-h-[28px] flex items-center justify-center">
          <FaArrowRight className={`mobiry-button-arrow-${color}`} size={'15px'} />
        </div>
      ) : (
        <></>
      )}
      {arrowLeft ? (
        <div className="absolute left-[6px] bg-white rounded-[50%] min-w-[28px] min-h-[28px] flex items-center justify-center">
          <FaArrowLeft className={`mobiry-button-arrow-${color}`} size={'15px'} />
        </div>
      ) : (
        <></>
      )}
    </div>
  );

  if (onClick) {
    return <div onClick={onClick}>{link ? <Link to={link}>{innerButton()}</Link> : <>{innerButton()}</>}</div>;
  }

  return <>{link ? <Link to={link}>{innerButton()}</Link> : <>{innerButton()}</>}</>;
};

export default Button;
