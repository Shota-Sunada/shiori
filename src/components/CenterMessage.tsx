import { type ReactNode } from 'react';

interface CenterMessageProps {
  children: ReactNode;
  className?: string;
}

// 汎用的な中央配置メッセージコンポーネント
const CenterMessage = ({ children, className = '' }: CenterMessageProps) => <div className={`flex flex-col items-center justify-center text-center ${className}`}>{children}</div>;

export default CenterMessage;
