import React from 'react';
import { FaRegCommentDots, FaInfoCircle, FaExclamationCircle, FaExclamationTriangle } from 'react-icons/fa';

type MessageType = 'notice' | 'info' | 'important' | 'alert';

interface MessageProps {
  children: React.ReactNode;
  className?: string;
  type?: MessageType;
}

const typeStyles: Record<MessageType, { label: string; bg: string; border: string; text: string; icon: React.ReactNode; iconColor: string }> = {
  notice: {
    label: '注意',
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-900',
    icon: <FaRegCommentDots />,
    iconColor: 'text-yellow-400'
  },
  info: {
    label: '詳細',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    icon: <FaInfoCircle />,
    iconColor: 'text-blue-500'
  },
  important: {
    label: '重要',
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-900',
    icon: <FaExclamationCircle />,
    iconColor: 'text-purple-700'
  },
  alert: {
    label: '警告',
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-900',
    icon: <FaExclamationTriangle />,
    iconColor: 'text-red-600'
  }
};

const Message: React.FC<MessageProps> = ({ children, className = '', type = 'info' }) => {
  const style = typeStyles[type];
  return (
    <div className={`${style.bg} ${style.border} border-l-4 rounded-md p-2 ${style.text} text-sm shadow-sm my-1 ${className}`}>
      <span className={`text-lg ${style.iconColor} select-none flex flex-row items-center`} aria-hidden>
        <p>{style.icon}</p>
        <p className={`ml-2 ${style.text}`}>{style.label}</p>
      </span>
      <div className="m-2 mt-1 flex flex-col items-start">{children}</div>
    </div>
  );
};

export default Message;
