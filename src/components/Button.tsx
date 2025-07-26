interface Props {
  text: string;
  onClick: React.MouseEventHandler<HTMLDivElement>;
}

const Button = (props: Props) => {
  return (
    <div className="mobiry-button flex flex-row items-center justify-center relative" onClick={props.onClick}>
      <p className="font-medium">{props.text}</p>
    </div>
  );
};

export default Button;
