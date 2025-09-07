import { useEffect, useCallback, useRef, type FC } from 'react';
import Button from './Button';

interface Roommate {
  gakuseki: string;
  surname: string;
  forename: string;
  class: number;
  number: number;
}

interface RoommateModalProps {
  roommates: Roommate[];
  onClose: () => void;
  hotelName: string;
  roomNumber: string;
}

const RoomDataModal: FC<RoommateModalProps> = ({ roommates, onClose, hotelName, roomNumber }) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    document.body.classList.add('modal-open');
    const listener = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener('keydown', listener);
    // 初期フォーカス
    setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);
    return () => {
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', listener);
    };
  }, [handleKeyDown]);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 modal-overlay bg-black/40" onClick={onClose} role="presentation" aria-label="背景クリックで閉じる">
      <div
        ref={dialogRef}
        className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-modal-title"
        tabIndex={-1}
        onClick={stopPropagation}>
        <p id="room-modal-title" className="text-xl font-bold mb-4">
          {hotelName} {roomNumber}
          {'号室'}
        </p>
        {roommates.length > 0 ? (
          <div>
            <p className="font-semibold mb-2">{'ルームメイト'}</p>
            <ul className="list-disc pl-5 space-y-1">
              {roommates.map((roommate) => (
                <li key={roommate.gakuseki}>{`${roommate.surname} ${roommate.forename} (5年${roommate.class}組${roommate.number}番)`}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>{'ルームメイトが見つかりませんでした。'}</p>
        )}
        <div className="flex items-center justify-center mt-4">
          <Button text="閉じる" arrowLeft onClick={onClose} color="purple" />
        </div>
      </div>
    </div>
  );
};

export default RoomDataModal;
