import { FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

interface RollCall {
  id: string;
  teacher_id: number;
  created_at: string;
  total_students: number;
  checked_in_students: number;
  is_active: boolean;
}

interface RollCallTableProps {
  rollCalls: RollCall[];
}

const RollCallTable = ({ rollCalls }: RollCallTableProps) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full max-w-[95dvw] bg-white">
        <thead>
          <tr>
            <th className="py-1 px-2 border-b">{'状態'}</th>
            <th className="py-1 px-2 border-b">{'開始日時'}</th>
            <th className="py-1 px-2 border-b">{'状況'}</th>
            <th className="py-1 px-2 border-b">{'先生'}</th>
            <th className="py-1 px-2 border-b">{'詳細'}</th>
          </tr>
        </thead>
        <tbody>
          {rollCalls.map((rollCall) => (
            <tr key={rollCall.id} className={`${!rollCall.is_active ? 'bg-gray-200' : ''}`}>
              <td className="py-0.5 px-2 border-b text-center min-w-18">
                {rollCall.is_active ? <span className="bg-green-500 text-white py-1 px-1 rounded">{'発動中'}</span> : <span className="bg-gray-500 text-white py-1 px-1 rounded">{'終了'}</span>}
              </td>
              <td className="py-0.5 px-2 border-b text-center">{new Date(rollCall.created_at).toLocaleString()}</td>
              <td className="py-0.5 px-2 border-b text-center">
                {rollCall.checked_in_students}
                {' / '}
                {rollCall.total_students}
              </td>
              <td className="py-0.5 px-2 border-b text-center">{rollCall.teacher_id}</td>
              <td className="py-0.5 px-3 border-b text-center">
                <div className="flex items-center justify-center">
                  <Link to={`/teacher/call?id=${rollCall.id}`}>
                    <FaArrowRight className="cursor-pointer bg-[#219ace30] rounded-2xl p-1.5" size={'30px'} color="#219bce" />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RollCallTable;
