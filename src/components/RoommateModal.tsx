import React from 'react';

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

const RoommateModal: React.FC<RoommateModalProps> = ({ roommates, onClose, hotelName, roomNumber }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">{hotelName} {roomNumber}号室のルームメイト</h2>
        {roommates.length > 0 ? (
          <ul>
            {roommates.map((roommate) => (
              <li key={roommate.gakuseki} className="mb-2">
                {roommate.class}組{roommate.number}番 {roommate.surname} {roommate.forename}
              </li>
            ))}
          </ul>
        ) : (
          <p>ルームメイトが見つかりませんでした。</p>
        )}
        <button
          onClick={onClose}
          className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default RoommateModal;
