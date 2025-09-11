import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth-context';
import TimeTable from '../components/TimeTable';
import { studentApi, teacherApi, type StudentDTO, type TeacherDTO } from '../helpers/domainApi';
import { DAY4_DATA, type COURSES_DAY1_KEY, type COURSES_DAY3_KEY, type COURSES_DAY4_KEY } from '../data/courses';
import ModernTable from '../components/ModernTable';
import ScrollToTopButton from '../components/ScrollToTopButton';
import '../styles/index-table.css';

const Yotei = () => {
  const { user } = useAuth();
  const [day1CourseKey, setDay1CourseKey] = useState<COURSES_DAY1_KEY | null>(null);
  const [day3CourseKey, setDay3CourseKey] = useState<COURSES_DAY3_KEY | null>(null);
  const [day4CourseKey, setDay4CourseKey] = useState<COURSES_DAY4_KEY | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 各日付のref
  const day1Ref = useRef<HTMLTableRowElement | null>(null);
  const day2Ref = useRef<HTMLTableRowElement | null>(null);
  const day3Ref = useRef<HTMLTableRowElement | null>(null);
  const day4Ref = useRef<HTMLTableRowElement | null>(null);

  const handleScroll = (ref: React.RefObject<HTMLTableRowElement | null>) => {
    if (ref.current) {
      const y = ref.current.getBoundingClientRect().top + window.scrollY - 100; // 100px上に余裕
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!user) {
        setError('ユーザー情報がありません');
        setLoading(false);
        return;
      }
      try {
        let day1: string | undefined;
        let day3: string | undefined;
        let day4: string | undefined;
        if (user.is_teacher) {
          const t: TeacherDTO = await teacherApi.self(user.userId);
          day1 = t.day1id;
          day3 = t.day3id;
          day4 = DAY4_DATA[t.day4class - 1];
        } else {
          const s: StudentDTO = await studentApi.getById(user.userId);
          day1 = s.day1id;
          day3 = s.day3id;
          day4 = DAY4_DATA[s.class - 1];
        }
        if (!day1) {
          setError('day1idが見つかりません');
          setLoading(false);
          return;
        }
        if (!day3) {
          setError('day3idが見つかりません');
          setLoading(false);
          return;
        }
        if (!day4) {
          setError('day4idが見つかりません');
          setLoading(false);
          return;
        }
        setDay1CourseKey(day1 as COURSES_DAY1_KEY);
        setDay3CourseKey(day3 as COURSES_DAY3_KEY);
        setDay4CourseKey(day4 as COURSES_DAY4_KEY);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user]);

  if (loading) return <div className="p-4 text-center">読み込み中…</div>;
  if (error) return <div className="p-4 text-center text-red-600">エラー: {error}</div>;
  if (!day1CourseKey) return <div className="p-4 text-center">コースが設定されていません</div>;

  return (
    <div className="p-2">
      <div className="flex flex-col items-center justify-start text-left p-2">
        <h2 className="font-bold text-3xl">全体の流れ</h2>
        {/* スクロールボタン */}
        <div className="flex gap-2 my-2">
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => handleScroll(day1Ref)}>
            1日目へ
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => handleScroll(day2Ref)}>
            2日目へ
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => handleScroll(day3Ref)}>
            3日目へ
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded" onClick={() => handleScroll(day4Ref)}>
            4日目へ
          </button>
        </div>
        <div className="w-full max-w-4xl my-3 index-table-wrapper">
          <ModernTable>
            <TimeTable ref={day1Ref}courseKey={'day1_common1'} />
            <TimeTable courseKey={day1CourseKey} />
            <TimeTable courseKey={'day1_common2'} />
            <TimeTable ref={day2Ref}courseKey={'day2_common'} />
            <TimeTable ref={day3Ref} courseKey={'day3_common1'} />
            <TimeTable courseKey={day3CourseKey} />
            <TimeTable courseKey={'day3_common2'} />
            <TimeTable ref={day4Ref} courseKey={'day4_common1'} />
            <TimeTable courseKey={day4CourseKey} />
            <TimeTable courseKey={'day4_common2'} />
          </ModernTable>
        </div>
      </div>
      <ScrollToTopButton />
    </div>
  );
};

export default Yotei;
