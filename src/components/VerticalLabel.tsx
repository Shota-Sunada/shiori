import React, { useEffect, useRef, useState } from 'react';

/**
 * iOS Safari の writing-mode: vertical-rl で文字順が逆転してしまうケース対策。
 * CSS 縦書きではなく Flex の縦積みで安定表示する。
 * （1文字ずつ縦方向に配置するため、長い文章は非推奨）
 */
interface VerticalLabelProps {
  text: string;
  className?: string;
  /** スクリーンリーダー用読み上げ文字列を別指定したい場合 */
  ariaLabel?: string;
}

const VerticalLabel: React.FC<VerticalLabelProps> = ({ text, className = '', ariaLabel }) => {
  const isIOS = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const [needReverse, setNeedReverse] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const chars = Array.from(text).filter((c) => c !== '\n');

  useEffect(() => {
    // レンダー後に最初の子要素と最後の子要素の文字が逆転しているかを判定
    const el = rootRef.current;
    if (!el) return;
    const first = el.querySelector('.vertical-char:first-child') as HTMLElement | null;
    const last = el.querySelector('.vertical-char:last-child') as HTMLElement | null;
    if (!first || !last) return;
    const expectedFirst = chars[0];
    // 期待する先頭文字と表示上の先頭(child)文字が違い、かつ末尾が期待先頭なら逆転と判断
    if (first.textContent !== expectedFirst && last.textContent === expectedFirst) {
      setNeedReverse(true);
    }
  }, [chars]);

  return (
    <span ref={rootRef} className={`vertical-stack ${isIOS ? 'is-ios' : ''} ${needReverse ? 'need-reverse' : ''} ${className}`} aria-label={ariaLabel || text} role="text">
      {chars.map((c, i) => (
        <span className="vertical-char" key={i} aria-hidden="true">
          {c}
        </span>
      ))}
    </span>
  );
};

export default VerticalLabel;
