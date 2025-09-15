import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';
import TimeTable from '../components/TimeTable';
import { appFetch } from '../helpers/apiClient';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
type Course = {
  id: number;
  course_key: string;
  name?: string;
  schedules: Schedule[];
};
import { studentApi, teacherApi, type StudentDTO, type TeacherDTO } from '../helpers/domainApi';
import { DAY4_DATA, type COURSES_DAY1_KEY, type COURSES_DAY3_KEY, type COURSES_DAY4_KEY } from '../data/courses';
import ModernTable from '../components/ModernTable';
import ScrollToTopButton from '../components/ScrollToTopButton';
import '../styles/index-table.css';
import MDButton, { BackToHome } from '../components/MDButton';
import type { Schedule } from './Admin/ScheduleAdmin/Types';

const Yotei = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [day1CourseKey, setDay1CourseKey] = useState<COURSES_DAY1_KEY | null>(null);
  const [day3CourseKey, setDay3CourseKey] = useState<COURSES_DAY3_KEY | null>(null);
  const [day4CourseKey, setDay4CourseKey] = useState<COURSES_DAY4_KEY | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 表示中ユーザーの名前
  const [displayName, setDisplayName] = useState<string | null>(null);
  // 全コースデータ
  const [courses, setCourses] = useState<Course[] | null>(null);

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
      // クエリでuser=xxxがあればそちらを優先
      const queryUserId = searchParams.get('user');
      const targetUserId = queryUserId || user?.userId;
      if (!targetUserId) {
        setError('ユーザー情報がありません');
        setLoading(false);
        return;
      }
      try {
        let day1: string | undefined;
        let day3: string | undefined;
        let day4: string | undefined;
        let name: string | null = null;

        if (!queryUserId && user?.is_teacher) {
          try {
            const t: TeacherDTO = await teacherApi.self(targetUserId);
            if (!t || !t.day1id || !t.day3id || !t.day4class) {
              setError('指定されたユーザーIDの先生データが存在しません');
              setLoading(false);
              return;
            }
            day1 = t.day1id;
            day3 = t.day3id;
            day4 = DAY4_DATA[t.day4class - 1];
            name = `${t.surname} ${t.forename}`;
          } catch {
            setError('指定されたユーザーIDの先生データが存在しません');
            setLoading(false);
            return;
          }
        } else {
          try {
            const s: StudentDTO = await studentApi.getById(targetUserId);
            day1 = s.day1id;
            day3 = s.day3id;
            day4 = DAY4_DATA[s.class - 1];
            name = `${s.surname} ${s.forename}`;
          } catch {
            setError('指定されたユーザーIDの生徒データが存在しません');
            setLoading(false);
            return;
          }
        }

        setDisplayName(name);
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
        setLoading(false);
        return;
      }
      // コースデータ取得
      try {
        const courseList = await appFetch<Course[]>(`${SERVER_ENDPOINT}/api/schedules`, { parse: 'json', cacheKey: 'schedules', requiresAuth: true });
        setCourses(courseList);
      } catch {
        setError('コースデータの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [user, searchParams]);

  if (loading) return <div className="p-4 text-center">読み込み中…</div>;
  if (error) return <div className="p-4 text-center text-red-600">エラー: {error}</div>;
  if (!day1CourseKey) return <div className="p-4 text-center">コースが設定されていません</div>;
  if (!courses) return <div className="p-4 text-center">コースデータを取得できませんでした</div>;

  return (
    <>
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
        <BackToHome user={user} />
        <div className="w-full max-w-4xl my-3 index-table-wrapper">
          {/* 表示中のユーザー名を上部に表示 */}
          {displayName && <div className="mb-2 text-lg font-semibold text-center text-blue-700">{displayName} さんの行程表</div>}
          <ModernTable>
            <TimeTable ref={day1Ref} courseKey={'day1_common1'} courses={courses} />
            <TimeTable courseKey={day1CourseKey} courses={courses} />
            <TimeTable courseKey={'day1_common2'} courses={courses} />
            <TimeTable ref={day2Ref} courseKey={'day2_common'} courses={courses} />
            <TimeTable ref={day3Ref} courseKey={'day3_common1'} courses={courses} />
            <TimeTable courseKey={day3CourseKey} courses={courses} />
            <TimeTable courseKey={'day3_common2'} courses={courses} />
            <TimeTable ref={day4Ref} courseKey={'day4_common1'} courses={courses} />
            <TimeTable courseKey={day4CourseKey} courses={courses} />
            <TimeTable courseKey={'day4_common2'} courses={courses} />
          </ModernTable>
        </div>
        <BackToHome user={user} />
      </div>
      <ScrollToTopButton />
    </>
  );
};

export default Yotei;
