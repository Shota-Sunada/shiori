import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { UI_ANIMATION } from '../config/constants';

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
// スクロールロック前のスクロール位置と body のインラインスタイルを保持
let scrollYBeforeLock = 0;
let prevBodyInlineStyle: Partial<CSSStyleDeclaration> | null = null;

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
  // 表示有無 (DOM マウント制御) と closing 状態
  const [rendered, setRendered] = useState(isOpen);
  const [closing, setClosing] = useState(false);

  // isOpen が true になったら描画開始
  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      // リオープン時に closing フラグを解除
      requestAnimationFrame(() => setClosing(false));
    } else if (rendered && !closing) {
      // 親から isOpen=false が通知されたら閉じアニメ開始
      // layout を一度読んでから closing にしアニメ適用を安定させる
      // (Safari 等で in -> out が同フレームだと out が飛ぶことがあるため)
      const node = overlayRef.current;
      if (node) {
        // 強制 reflow
        void node.getBoundingClientRect();
      }
      requestAnimationFrame(() => setClosing(true));
    }
  }, [isOpen, rendered, closing]);

  // 閉じアニメ終了検知 (animationend)
  useEffect(() => {
    if (!closing) return;
    const node = overlayRef.current;
    if (!node) return;
    let finished = false;
    const handleEnd = (e: AnimationEvent) => {
      if (e.target !== node) return; // overlay のアニメのみで判定
      finished = true;
      setRendered(false);
      setClosing(false);
    };
    node.addEventListener('animationend', handleEnd);
    // フォールバック: アニメ想定 + safety
    const fallback = setTimeout(() => {
      if (!finished) {
        setRendered(false);
        setClosing(false);
      }
    }, UI_ANIMATION.modal.dialogMs + UI_ANIMATION.modal.fallbackExtraMs);
    return () => {
      node.removeEventListener('animationend', handleEnd);
      clearTimeout(fallback);
    };
  }, [closing]);

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
        // 初回ロック時のみ現在のスクロール位置を保持して body を固定
        scrollYBeforeLock = window.scrollY || document.documentElement.scrollTop || 0;
        prevBodyInlineStyle = {
          position: document.body.style.position,
          top: document.body.style.top,
          left: document.body.style.left,
          right: document.body.style.right,
          width: document.body.style.width
        };
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollYBeforeLock}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.width = '100%';
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
          // body 固定解除とスクロール位置の復元
          if (prevBodyInlineStyle) {
            document.body.style.position = prevBodyInlineStyle.position || '';
            document.body.style.top = prevBodyInlineStyle.top || '';
            document.body.style.left = prevBodyInlineStyle.left || '';
            document.body.style.right = prevBodyInlineStyle.right || '';
            document.body.style.width = prevBodyInlineStyle.width || '';
          } else {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.width = '';
          }
          window.scrollTo(0, scrollYBeforeLock);
          prevBodyInlineStyle = null;
        }
      }
    };
  }, [isOpen, closeOnEsc, lockScroll, handleKeyDown, initialFocusRef]);

  if (!rendered) return null;

  const overlayEl = (
    <div
      ref={overlayRef}
      className={`${defaultOverlayBase} modal-anim-overlay ${closing ? 'modal-closing' : ''} ${zIndexClassName} ${overlayClassName}`.trim()}
      data-state={closing ? 'closing' : 'open'}
      role="presentation"
      onClick={() => closeOnOverlayClick && onClose()}>
      <div
        ref={dialogRef}
        className={`${defaultDialogBase} modal-anim-dialog ${className}`.trim()}
        data-state={closing ? 'closing' : 'open'}
        role={role}
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );

  if (!usePortal) return overlayEl;

  return createPortal(overlayEl, document.body);
};

export default Modal;
