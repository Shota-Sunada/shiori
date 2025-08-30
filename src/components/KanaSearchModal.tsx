import React, { useState, useEffect } from 'react';
import type { student } from '../data/students';
import StudentCardContent from './StudentCardContent';

interface KanaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKanaSelect: (kana: string) => void;
  surnameStudents: student[];
  forenameStudents: student[];
  onStudentSelect: (student: student) => void;
}

const KANA_ROWS = [
  ['ア', 'イ', 'ウ', 'エ', 'オ'],
  ['カ', 'キ', 'ク', 'ケ', 'コ'],
  ['サ', 'シ', 'ス', 'セ', 'ソ'],
  ['タ', 'チ', 'ツ', 'テ', 'ト'],
  ['ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
  ['ハ', 'ヒ', 'フ', 'ヘ', 'ホ'],
  ['マ', 'ミ', 'ム', 'メ', 'モ'],
  ['ヤ', '', 'ユ', '', 'ヨ'],
  ['ラ', 'リ', 'ル', 'レ', 'ロ'],
  ['ワ', '', 'ヲ', '', 'ン'],
];

const KanaSearchModal: React.FC<KanaSearchModalProps> = ({
  isOpen,
  onClose,
  onKanaSelect,
  surnameStudents,
  forenameStudents,
  onStudentSelect,
}) => {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    if (isOpen) {
      body.classList.add('modal-open');
      html.classList.add('modal-open');
    } else {
      body.classList.remove('modal-open');
      html.classList.remove('modal-open');
    }

    // Reset search when modal is closed
    if (!isOpen) {
      setShowResults(false);
      onKanaSelect('');
    }

    return () => {
      body.classList.remove('modal-open');
      html.classList.remove('modal-open');
    };
  }, [isOpen, onKanaSelect]);

  if (!isOpen) {
    return null;
  }

  const handleKanaClick = (kana: string) => {
    onKanaSelect(kana);
    setShowResults(true);
  };

  const handleStudentClick = (student: student) => {
    onStudentSelect(student);
    onClose();
  }

  const handleClose = () => {
      onClose();
  }

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#00000080] flex justify-center items-center z-[1000]" onClick={handleClose}>
      <div className="bg-white p-[20px] rounded-md w-[90%] max-w-[500px] h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300">
          <h2 className="m-0 text-xl">{"カタカナ検索"}</h2>
          <button onClick={handleClose} className="bg-none border-none text-2xl cursor-pointer">
            &times;
          </button>
        </div>
        <div className="min-h-0 flex flex-col">
          {!showResults ? (
            <div className="grid grid-cols-5 gap-2.5 content-center h-full">
              {KANA_ROWS.flat().map((kana, index) =>
                kana ? (
                  <button
                    className='p-2.5 border-2 border-solid border-[#ccc] bg-[#f9f9f9] rounded-md cursor-pointer hover:bg-[#eee]'
                    key={index}
                    onClick={() => handleKanaClick(kana)}
                  >
                    {kana}
                  </button>
                ) : (
                  <div key={index}></div>
                )
              )}
            </div>
          ) : (
            <div className="flex flex-col min-h-0">
              <div className="flex flex-col min-h-0 h-[65%]">
                <p>{"姓"}</p>
                <div className="overflow-y-auto">
                  {surnameStudents.length > 0 ? (
                    surnameStudents.map((s) => (
                      <div key={s.gakuseki} className="p-2.5 border-b-2 border-solid border-[#eee] cursor-pointer hover:bg-[#f0f0f0]" onClick={() => handleStudentClick(s)}>
                        <StudentCardContent student={s} />
                      </div>
                    ))
                  ) : (
                    <p>{"該当する生徒は見つかりませんでした。"}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col min-h-0 h-[35%]">
                <p className="mt-4">{"名"}</p>
                <div className="overflow-y-auto">
                  {forenameStudents.length > 0 ? (
                    forenameStudents.map((s) => (
                      <div key={s.gakuseki} className="p-2.5 border-b-2 border-solid border-[#eee] cursor-pointer hover:bg-[#f0f0f0]" onClick={() => handleStudentClick(s)}>
                        <StudentCardContent student={s} />
                      </div>
                    ))
                  ) : (
                    <p>{"該当する生徒は見つかりませんでした。"}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KanaSearchModal;
