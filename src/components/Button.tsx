import { FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

interface Props {
  text: string;
  arrow?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  link?: string;
  color?: string;
  hoverColor?: string;
}

const Button = (props: Props) => {
  const innerButton = () => (
    <div className={`mobiry-button flex flex-row items-center justify-center relative bg-[${props.color ? props.color : "#219bce"}] hover:bg-[${props.hoverColor ? props.hoverColor : "#008fc0"}]`}>
      <p className="font-medium">{props.text}</p>
      {props.arrow ? (
        <div className="absolute right-[6px] bg-white rounded-[50%] min-w-[28px] min-h-[28px] flex items-center justify-center">
          <FaArrowRight size={'15px'} color={props.color ? props.color : '#219bce'} />
        </div>
      ) : (
        <></>
      )}
    </div>
  );

  if (props.onClick) {
    return <div onClick={props.onClick}>{props.link ? <Link to={props.link}>{innerButton()}</Link> : <>{innerButton()}</>}</div>;
  }

  return <>{props.link ? <Link to={props.link}>{innerButton()}</Link> : <>{innerButton()}</>}</>;
};

export default Button;
