import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import KanaSearchModal from '../components/KanaSearchModal';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';
import Button from '../components/Button';

const TeacherIndex = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [studentData, setStudentData] = useState<student | null>(null);
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);
  const [specificStudentId, setSpecificStudentId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(2);

  const teacher_name_ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
        const students = await response.json();
        students.sort((a: student, b: student) => {
          if (a.gakuseki < b.gakuseki) {
            return -1;
          }
          if (a.gakuseki > b.gakuseki) {
            return 1;
          }
          return 0;
        });
        setAllStudents(students);
      } catch (error) {
        console.error('生徒データの取得に失敗:', error);
      }
    };
    if (token) {
      fetchAllStudents();
    }
  }, [token]);

  const handleStudentSelect = (student: student) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  };

  const handleCallSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!user || !token) {
      alert('ログインしていません。');
      return;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          teacher_id: user.userId,
          specific_student_id: specificStudentId || null,
          duration_minutes: durationMinutes,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }

      const data = await response.json();
      const { rollCallId } = data;

      navigate(`/teacher/call?id=${rollCallId}`);
    } catch (error) {
      console.error('点呼の開始に失敗しました:', error);
      alert('点呼の開始に失敗しました。');
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="m-[10px] text-2xl">{'ようこそ、先生用ページへ'}</p>

      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="m-[10px] text-2xl">{'生徒情報検索'}</p>
          <button
            onClick={() => {
              setKanaSearchVisible(true);
            }}
            className="p-2 ml-2 text-white bg-green-500 rounded cursor-pointer">
            {'生徒カタカナ検索'}
          </button>
        </div>
      </section>

      <IndexTable studentData={studentData} />

      <section id="call" className="m-2 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-md">
          <p className="m-[10px] text-2xl font-bold">{'点呼システム'}</p>
          {/* <Link to="/teacher/roll-call-list" className="text-blue-500 hover:underline mb-4">{"現在発動中の点呼一覧へ"}</Link> */}
          <Button text="点呼一覧へ" arrow onClick={() => navigate('/teacher/roll-call-list')} />
          <form className="w-full mt-4" onSubmit={handleCallSubmit}>
            <div className="mb-4">
              <label htmlFor="teacher_name" className="block text-gray-700 text-sm font-bold mb-2">
                {'先生名前'}
              </label>
              <input
                ref={teacher_name_ref}
                type="text"
                name="teacher_name"
                id="teacher_name"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">{'点呼時間 (分) - ベース20秒に加えて何分、点呼するか'}</label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setDurationMinutes(period)}
                    className={`py-2 px-4 rounded focus:outline-none ${
                      durationMinutes === period ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="target_students" className="block text-gray-700 text-sm font-bold mb-2">
                {'対象の生徒 (全員に送信)'}
              </label>
              <select
                name="target_students"
                id="target_students"
                disabled
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200">
                <option value="all">{'全員'}</option>
              </select>
            </div>
            <div className="mb-6">
              <label htmlFor="specific_student_id" className="block text-gray-700 text-sm font-bold mb-2">
                {'特定生徒に送信 (学籍番号)'}
              </label>
              <input
                type="text"
                name="specific_student_id"
                id="specific_student_id"
                placeholder="学籍番号を入力..."
                value={specificStudentId}
                onChange={(e) => setSpecificStudentId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <p className="text-xs text-gray-600 mt-1">{'ここに学籍番号を入力すると、その生徒にのみ通知が送信されます。空の場合は、上で選択中の生徒に送信されます。'}</p>
            </div>
            <div className="flex items-center justify-center">
              <button type="submit">
                <Button text="点呼開始" arrow onClick={() => {}} />
              </button>
            </div>
          </form>
        </div>
      </section>

      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default TeacherIndex;