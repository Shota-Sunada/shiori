import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import type { MouseEventHandler } from 'react';

interface MDButtonProps {
  text: string;
  arrowRight?: boolean;
  arrowLeft?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  link?: string;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'gray' | 'white' | 'transparent';
  width?: 'mobiry-button-200' | 'mobiry-button-150';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const MDButton = ({ text, arrowRight, arrowLeft, onClick, link, color = 'blue', width = 'mobiry-button-200', disabled = false, className = '', type = 'button' }: MDButtonProps) => {
  const baseClass = `mobiry-button-${color} text-align p-[8px] ${width} rounded-[20px] text-white transition-[0.2s] font-[15px] flex flex-row items-center justify-center relative`;
  const stateClass = disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer';

  const content = (
    <>
      <p className="font-medium select-none">{text}</p>
      {arrowRight && (
        <div className="absolute right-[6px] bg-white rounded-full min-w-[28px] min-h-[28px] flex items-center justify-center">
          <FaArrowRight className={`mobiry-button-arrow-${color}`} size={15} />
        </div>
      )}
      {arrowLeft && (
        <div className="absolute left-[6px] bg-white rounded-full min-w-[28px] min-h-[28px] flex items-center justify-center">
          <FaArrowLeft className={`mobiry-button-arrow-${color}`} size={15} />
        </div>
      )}
    </>
  );

  if (link && !disabled) {
    // Link バリアントでも "type" を全状態で反映させたい要求に対応するため data attribute に保持
    // (a 要素 / Link 自体には button の type 属性は無効なので UI テストやスタイル用に露出)
    return (
      <div className="m-2">
        <Link to={link} data-button-type={type} className={`${baseClass} ${stateClass} ${className}`}>
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className="m-2">
      <button
        type={type}
        onClick={disabled ? undefined : (onClick as MouseEventHandler<HTMLButtonElement>)}
        disabled={disabled}
        aria-disabled={disabled}
        className={`${baseClass} ${stateClass} ${className}`}>
        {content}
      </button>
    </div>
  );
};

export default MDButton;
