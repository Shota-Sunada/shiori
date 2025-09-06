import { useEffect, useState } from 'react';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import KanaSearchModal from '../components/KanaSearchModal';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';
import Button from '../components/Button';

const TeacherIndexTable = () => {
  const { token } = useAuth();

  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [studentData, setStudentData] = useState<student | null>(null);
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);

  useEffect(() => {
    const fetchAllStudents = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
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
  return (
    <div className="flex flex-col items-center justify-center m-2">
      <Button text="ホームに戻る" arrowLeft link="/teacher" />
      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-2xl">{'生徒情報検索'}</p>
          <button
            onClick={() => {
              setKanaSearchVisible(true);
            }}
            className="p-2 text-white bg-green-500 rounded cursor-pointer">
            {'生徒カタカナ検索'}
          </button>
        </div>
      </section>

      <IndexTable studentData={studentData} />

      <Button text="ホームに戻る" arrowLeft link="/teacher" />

      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default TeacherIndexTable;
