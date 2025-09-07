import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth-context';
import { appFetch } from '../helpers/apiClient';
import type { student } from '../data/students';
import KanaSearchModal from '../components/KanaSearchModal';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';
import MDButton from '../components/MDButton';

const TeacherIndexTable = () => {
  const { token } = useAuth();

  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [studentData, setStudentData] = useState<student | null>(null);
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const loadStudents = useCallback(
    async (force = false) => {
      if (!token) return;
      setLoading(true);
      try {
        const students = await appFetch<student[]>(`${SERVER_ENDPOINT}/api/students`, {
          requiresAuth: true,
          cacheKey: 'students:list',
          alwaysFetch: force // interval時は最新取得
        });
        students.sort((a, b) => a.gakuseki - b.gakuseki);
        setAllStudents(students);
      } catch (e) {
        console.error('生徒データの取得に失敗:', e);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    if (!token) return;
    intervalRef.current = window.setInterval(
      () => {
        loadStudents(true);
      },
      5 * 60 * 1000
    ); // 5分
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [token, loadStudents]);

  const handleStudentSelect = useCallback((student: student) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center m-2">
      <MDButton text="ホームに戻る" arrowLeft link="/teacher" />
      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-2xl">{'生徒情報検索'}</p>
          <MDButton text="生徒カタカナ検索" color="green" onClick={() => setKanaSearchVisible(true)} />
        </div>
      </section>

      {loading && <p>読み込み中...</p>}
      <IndexTable studentData={studentData} />

      <MDButton text="ホームに戻る" arrowLeft link="/teacher" />

      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default TeacherIndexTable;
