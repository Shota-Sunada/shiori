import { useState } from 'react';

const Call = () => {
  const [isDone, setIsDone] = useState<boolean>(false);

  return (
    <div className="flex flex-col items-center justify-center m-5">
      <p className="text-xl m-3">{'点呼です！'}</p>
      {isDone ? (
        <div className="bg-green-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer">
          <p>{'点呼完了!'}</p>
        </div>
      ) : (
        <div className="bg-red-500 text-white p-18 text-4xl font-bold rounded-[100%] w-[40dvh] h-[40dvh] flex items-center justify-center cursor-pointer flex-col" onClick={() => setIsDone(true)}>
          <p> {'点呼!'}</p>
          <p className="text-xl mt-5">{'残り時間'}</p>
          <p className="text-xl">{'00:00'}</p>
        </div>
      )}

      <p className="text-xl mt-5">{isDone ? '確認しました！' : '時間内に点呼に応答してください！'}</p>
    </div>
  );
};

export default Call;
