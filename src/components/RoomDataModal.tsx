import { type FC } from 'react';
import MDButton from './MDButton';
import Modal from './Modal';

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
  return (
    <Modal isOpen onClose={onClose} ariaLabelledBy="room-modal-title" className="p-6 rounded-lg shadow-lg max-w-md w-full" overlayClassName="p-4" closeOnEsc={false} closeOnOverlayClick={false}>
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
        <MDButton text="閉じる" arrowLeft onClick={onClose} color="purple" />
      </div>
    </Modal>
  );
};

export default RoomDataModal;
