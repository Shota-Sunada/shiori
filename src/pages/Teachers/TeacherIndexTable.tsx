import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../auth-context';
import type { StudentDTO } from '../../helpers/domainApi';
import { studentApi } from '../../helpers/domainApi';
import KanaSearchModal from '../../components/KanaSearchModal';
import IndexTable from '../../components/IndexTable';
import MDButton, { BackToHome } from '../../components/MDButton';

const TeacherIndexTable = () => {
  const { user, token } = useAuth();

  const [allStudents, setAllStudents] = useState<StudentDTO[]>([]);
  const [studentData, setStudentData] = useState<StudentDTO | null>(null);
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const loadStudents = useCallback(
    async (force = false) => {
      if (!token) return;
      setLoading(true);
      try {
        const students = await studentApi.list({ alwaysFetch: force, staleWhileRevalidate: true });
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

  const handleStudentSelect = useCallback((student: StudentDTO) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center m-2">
      <BackToHome user={user} />
      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="text-2xl">{'生徒情報検索'}</p>
          <MDButton text="生徒カタカナ検索" color="green" onClick={() => setKanaSearchVisible(true)} />
        </div>
      </section>

      {loading && <p>読み込み中...</p>}
      <IndexTable studentData={studentData} isStudentSearch />
      <BackToHome user={user} />
      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default TeacherIndexTable;
