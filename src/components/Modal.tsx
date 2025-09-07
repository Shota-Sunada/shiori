import React, { useEffect, useRef, useCallback } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  ariaLabelledBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** 追加のダイアログラッパークラス */
  className?: string;
  /** 追加のオーバーレイクラス */
  overlayClassName?: string;
  /** 初期フォーカスさせたい要素 */
  initialFocusRef?: RefObject<HTMLElement>;
  /** ESC キーで閉じる (default: true) */
  closeOnEsc?: boolean;
  /** オーバーレイクリックで閉じる (default: true) */
  closeOnOverlayClick?: boolean;
  /** スクロールロック (default: true) */
  lockScroll?: boolean;
  /** body ではなく親コンテナ内で relative/fixed を使いたい場合 false */
  usePortal?: boolean;
  /** z-index を制御したい場合 */
  zIndexClassName?: string; // 例: z-[1100]
}

const defaultOverlayBase = 'fixed inset-0 flex items-center justify-center bg-black/40 modal-overlay p-4';
const defaultDialogBase = 'bg-white rounded-lg shadow-lg outline-none';

// 同時に複数モーダルが開いた場合のスクロールロック管理
let openModalCount = 0;

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  ariaLabelledBy,
  role = 'dialog',
  className = 'p-6',
  overlayClassName = '',
  initialFocusRef,
  closeOnEsc = true,
  closeOnOverlayClick = true,
  lockScroll = true,
  usePortal = true,
  zIndexClassName = 'z-[1000]'
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && closeOnEsc) {
        e.preventDefault();
        onClose();
      }
    },
    [closeOnEsc, isOpen, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    if (closeOnEsc) {
      window.addEventListener('keydown', handleKeyDown);
    }
    if (lockScroll) {
      if (openModalCount === 0) {
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
      }
      openModalCount += 1;
    }
    const target = initialFocusRef?.current || dialogRef.current;
    setTimeout(() => target?.focus(), 0);
    return () => {
      if (closeOnEsc) {
        window.removeEventListener('keydown', handleKeyDown);
      }
      if (lockScroll) {
        openModalCount = Math.max(0, openModalCount - 1);
        if (openModalCount === 0) {
          document.body.classList.remove('modal-open');
          document.documentElement.classList.remove('modal-open');
        }
      }
    };
  }, [isOpen, closeOnEsc, lockScroll, handleKeyDown, initialFocusRef]);

  if (!isOpen) return null;

  const overlayEl = (
    <div ref={overlayRef} className={`${defaultOverlayBase} ${zIndexClassName} ${overlayClassName}`.trim()} role="presentation" onClick={() => closeOnOverlayClick && onClose()}>
      <div ref={dialogRef} className={`${defaultDialogBase} ${className}`.trim()} role={role} aria-modal="true" aria-labelledby={ariaLabelledBy} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (!usePortal) return overlayEl;

  return createPortal(overlayEl, document.body);
};

export default Modal;
