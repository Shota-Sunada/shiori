import React from 'react';
import type { ReactNode } from 'react';

interface LoadingPageProps {
  message?: string;
  children?: ReactNode;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ message = '読込中...', children }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-white">
    <div className="text-2xl text-gray-600 animate-pulse py-8">{message}</div>
    <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
    {children && <div className="w-full flex flex-col items-center">{children}</div>}
  </div>
);

export default LoadingPage;
