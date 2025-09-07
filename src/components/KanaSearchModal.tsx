import { useState, useEffect, type FC, useRef } from 'react';
import type { student } from '../data/students';
import StudentCardContent from './StudentCardContent';
import Modal from './Modal';

interface KanaSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  allStudents: student[];
  onStudentSelect: (student: student) => void;
  closeOnSelect?: boolean;
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
  ['ワ', '', 'ヲ', '', 'ン']
];

const getDakutenHandakutenMap = (): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  map.set('カ', ['カ', 'ガ']);
  map.set('キ', ['キ', 'ギ']);
  map.set('ク', ['ク', 'グ']);
  map.set('ケ', ['ケ', 'ゲ']);
  map.set('コ', ['コ', 'ゴ']);
  map.set('サ', ['サ', 'ザ']);
  map.set('シ', ['シ', 'ジ']);
  map.set('ス', ['ス', 'ズ']);
  map.set('セ', ['セ', 'ゼ']);
  map.set('ソ', ['ソ', 'ゾ']);
  map.set('タ', ['タ', 'ダ']);
  map.set('チ', ['チ', 'ヂ']);
  map.set('ツ', ['ツ', 'ヅ']);
  map.set('テ', ['テ', 'デ']);
  map.set('ト', ['ト', 'ド']);
  map.set('ハ', ['ハ', 'バ', 'パ']);
  map.set('ヒ', ['ヒ', 'ビ', 'ピ']);
  map.set('フ', ['フ', 'ブ', 'プ']);
  map.set('ヘ', ['ヘ', 'ベ', 'ペ']);
  map.set('ホ', ['ホ', 'ボ', 'ポ']);
  return map;
};

const KanaSearchModal: FC<KanaSearchModalProps> = ({ isOpen, onClose, allStudents, onStudentSelect, closeOnSelect = true }) => {
  const [showResults, setShowResults] = useState(false);
  const [currentKana, setCurrentKana] = useState<string | undefined>('');
  const [selectedKana, setSelectedKana] = useState('');
  const [filteredBySurnameKana, setFilteredBySurnameKana] = useState<student[]>([]);
  const [filteredByForenameKana, setFilteredByForenameKana] = useState<student[]>([]);

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

    if (!isOpen) {
      setShowResults(false);
      setSelectedKana('');
    }

    return () => {
      body.classList.remove('modal-open');
      html.classList.remove('modal-open');
    };
  }, [isOpen]);

  useEffect(() => {
    if (selectedKana) {
      const dakutenHandakutenMap = getDakutenHandakutenMap();
      const searchKanas = dakutenHandakutenMap.get(selectedKana) || [selectedKana];

      const surnameMatches = allStudents.filter((s) => {
        return s.surname_kana && searchKanas.some((kana) => s.surname_kana.startsWith(kana));
      });
      const forenameMatches = allStudents.filter((s) => {
        return s.forename_kana && searchKanas.some((kana) => s.forename_kana.startsWith(kana));
      });

      setFilteredBySurnameKana(surnameMatches);
      setFilteredByForenameKana(forenameMatches);
    } else {
      setFilteredBySurnameKana([]);
      setFilteredByForenameKana([]);
    }
  }, [selectedKana, allStudents]);

  const firstInteractiveRef = useRef<HTMLButtonElement | null>(null);

  const handleKanaClick = (kana: string) => {
    if (selectedKana === kana) {
      setSelectedKana('');
      setShowResults(false);
    } else {
      setSelectedKana(kana);
      setShowResults(true);
    }
  };

  const handleStudentClick = (student: student) => {
    onStudentSelect(student);
    if (closeOnSelect) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
    setCurrentKana(undefined);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabelledBy="kana-search-title"
      className="p-5 rounded-md w-[90%] max-w-[500px] h-[80vh] flex flex-col"
      overlayClassName="p-4"
      initialFocusRef={firstInteractiveRef as unknown as React.RefObject<HTMLElement>}
      closeOnEsc={false}
      closeOnOverlayClick={false}>
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300">
        <h2 id="kana-search-title" className="m-0 text-xl">
          {'カタカナ検索'}
        </h2>
        <button onClick={handleClose} className="flex flex-row items-center bg-none border-none cursor-pointer">
          <p>{'閉じる'}</p>
          <p className="ml-1 text-2xl">&times;</p>
        </button>
      </div>
      <div className="min-h-0 flex flex-col">
        {!showResults ? (
          <div className="grid grid-cols-5 gap-2.5 content-center h-full">
            {KANA_ROWS.flat().map((kana, index) =>
              kana ? (
                <button
                  ref={index === 0 ? firstInteractiveRef : undefined}
                  className="p-2.5 border-2 border-solid border-[#ccc] bg-[#f9f9f9] rounded-md cursor-pointer hover:bg-[#eee] focus:outline-none focus:ring"
                  key={index}
                  onClick={() => {
                    handleKanaClick(kana);
                    setCurrentKana(kana);
                  }}>
                  {kana}
                </button>
              ) : (
                <div key={index}></div>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col min-h-0">
            <p>{`「${currentKana}」の検索結果`}</p>
            <div className="flex flex-col min-h-0 overflow-y-auto">
              <p>{'姓'}</p>
              <div className="">
                {filteredBySurnameKana.length > 0 ? (
                  filteredBySurnameKana.map((s) => (
                    <div key={s.gakuseki} className="p-2.5 border-b-2 border-solid border-[#eee] cursor-pointer hover:bg-[#f0f0f0]" onClick={() => handleStudentClick(s)}>
                      <StudentCardContent student={s} />
                    </div>
                  ))
                ) : (
                  <p>{'該当する生徒は見つかりませんでした。'}</p>
                )}
              </div>
              <p className="mt-4">{'名'}</p>
              <div className="">
                {filteredByForenameKana.length > 0 ? (
                  filteredByForenameKana.map((s) => (
                    <div key={s.gakuseki} className="p-2.5 border-b-2 border-solid border-[#eee] cursor-pointer hover:bg-[#f0f0f0]" onClick={() => handleStudentClick(s)}>
                      <StudentCardContent student={s} />
                    </div>
                  ))
                ) : (
                  <p>{'該当する生徒は見つかりませんでした。'}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default KanaSearchModal;
