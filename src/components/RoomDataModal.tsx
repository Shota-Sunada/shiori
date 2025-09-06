import { useEffect, type FC } from 'react';

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
        <button onClick={onClose} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
          {'閉じる'}
        </button>
      </div>
    </div>
  );
};

export default RoomDataModal;
