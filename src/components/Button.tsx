interface Props {
  text: string;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}

const Button = (props: Props) => {
  return (
    <button className="mobiry-button flex flex-row items-center justify-center relative" onClick={props.onClick}>
      <p className="font-medium">{props.text}</p>
    </button>
  );
};

export default Button;
