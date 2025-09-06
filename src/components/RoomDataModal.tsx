import { useEffect, type FC } from 'react';
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
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 modal-overlay">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <p className="text-xl font-bold mb-4">
          {hotelName} {roomNumber}
          {'号室'}
        </p>
        {roommates.length > 0 ? (
          <div>
            <p>{'ルームメイト'}</p>
            {roommates.map((roommate) => (
              <li key={roommate.gakuseki} className="">
                {`${roommate.surname} ${roommate.forename} (5年${roommate.class}組${roommate.number}番)`}
              </li>
            ))}
          </div>
        ) : (
          <p>{'ルームメイトが見つかりませんでした。'}</p>
        )}
        <div className='flex items-center justify-center m-2'>
          <Button text="閉じる" arrowLeft onClick={onClose} color="purple"></Button>
        </div>
      </div>
    </div>
  );
};

export default RoomDataModal;
