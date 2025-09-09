import type { ReactNode } from 'react';

interface ModernTableProps {
  children: ReactNode;
  className?: string;
}

/**
 * 共通テーブルラッパー
 * - 一貫した見た目 (table-base / table-rounded / table-shadow)
 * - thead/tbody/colgroup は children として自由に構成
 */
const ModernTable = ({ children, className = '' }: ModernTableProps) => {
  const base = 'table-base table-rounded table-shadow';
  return <table className={`${base} ${className}`.trim()}>{children}</table>;
};

export default ModernTable;
