import { useEffect, useState } from 'react';

const Memo = () => {
  // メモ欄の状態管理（トップレベルで1回だけ宣言）
  const [memo, setMemo] = useState<string>('');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('shiori_memo') || '';
      setMemo(saved);
    }
    // setMemoはuseStateのセッターなので依存配列に含めなくてよい
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('shiori_memo', memo);
    }
  }, [memo]);

  return (
    <div className="w-full max-w-md mt-6 mb-2">
      <label htmlFor="memo" className="block mb-1 font-semibold text-gray-700">
        メモ欄
      </label>
      <textarea
        id="memo"
        className="w-full h-32 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 resize-y shadow-sm"
        placeholder="自由にメモを残せます（この端末だけに保存されます）"
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
      />
      <div className="text-xs text-gray-400 mt-1">※ メモ内容はこの端末のみに保存されます</div>
    </div>
  );
};

export default Memo;
