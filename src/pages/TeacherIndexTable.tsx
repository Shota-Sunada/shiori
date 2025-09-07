import { useEffect, useState, useCallback } from 'react';
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

  const fetchAllStudents = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTPエラー status: ${response.status}`);
      const students: student[] = await response.json();
      students.sort((a, b) => a.gakuseki - b.gakuseki);
      setAllStudents(students);
    } catch (error) {
      console.error('生徒データの取得に失敗:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchAllStudents();
  }, [fetchAllStudents]);

  const handleStudentSelect = useCallback((student: student) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center m-2">
      <Button text="ホームに戻る" arrowLeft link="/teacher" />
      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-2xl">{'生徒情報検索'}</p>
          <Button text="生徒カタカナ検索" color="green" onClick={() => setKanaSearchVisible(true)} />
        </div>
      </section>

      <IndexTable studentData={studentData} />

      <Button text="ホームに戻る" arrowLeft link="/teacher" />

      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default TeacherIndexTable;
