import { useParams } from 'react-router-dom';

const TeacherCall = () => {
  const { rollCallId } = useParams<{ rollCallId: string }>();

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="m-[10px] text-2xl">{'点呼実施中'}</p>
      <p className="m-[10px] text-xl">{`点呼ID: ${rollCallId}`}</p>
      <button className="p-2 px-4 mt-4 text-white bg-red-500 rounded hover:bg-red-700 focus:outline-none focus:shadow-outline cursor-pointer">
        {'点呼終了'}
      </button>
    </div>
  );
};

export default TeacherCall;