import { useCallback, useEffect, useState } from 'react';

const ScrollToTopButton = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!visible) return null;

  return (
    <button className="sticky flex bottom-4 right-4 px-4 py-2 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-700 transition z-[10000]" onClick={handleClick} aria-label="ページの一番上に戻る">
      ↑
    </button>
  );
};

export default ScrollToTopButton;
