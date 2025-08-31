import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../data/courses';
import '../styles/index-table.css';
import { DAY4_DATA, DAY4_TEACHERS } from '../data/day4';
import KanaSearchModal from '../components/KanaSearchModal';
import { sendNotification } from '../lib/notifications';
import { SERVER_ENDPOINT } from '../app';

const TeacherIndex = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // State
  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [filteredBySurnameKana, setFilteredBySurnameKana] = useState<student[]>([]);
  const [filteredByForenameKana, setFilteredByForenameKana] = useState<student[]>([]);
  const [studentData, setStudentData] = useState<student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKana, setSelectedKana] = useState('');
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);
  const [specificStudentId, setSpecificStudentId] = useState(''); // For specific student call

  const teacher_name_ref = useRef<HTMLInputElement>(null);

  // Effects
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/students`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const students = await response.json();
        // sort by gakuseki
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
        console.error('Failed to fetch students:', error);
        // Optionally, set an error state to show in the UI
      }
    };
    fetchAllStudents();
  }, []);

  useEffect(() => {
    // Kana search
    if (selectedKana) {
      const surnameMatches = allStudents.filter((s) => s.surname_kana.startsWith(selectedKana));
      const forenameMatches = allStudents.filter((s) => s.forename_kana.startsWith(selectedKana));
      setFilteredBySurnameKana(surnameMatches);
      setFilteredByForenameKana(forenameMatches);
    } else {
      setFilteredBySurnameKana([]);
      setFilteredByForenameKana([]);
    }
  }, [searchTerm, selectedKana, allStudents]);

  // Handlers
  const handleKanaSelect = (kana: string) => {
    if (selectedKana === kana) {
      setSelectedKana(''); // Toggle off
    } else {
      setSelectedKana(kana);
      setSearchTerm(''); // Clear text search
    }
  };

  const handleStudentSelect = (student: student) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  };

  const handleCallSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const teacherName = teacher_name_ref.current?.value;
    if (!teacherName) {
      alert('先生の名前を入力してください。');
      return;
    }

    if (!specificStudentId) {
      alert('呼び出す生徒を選択または指定してください。');
      return;
    }

    const result = await sendNotification({
      userId: specificStudentId,
      title: '先生からの呼び出しです',
      body: `${teacherName}先生があなたを呼んでいます。`,
    });

    if (result.success) {
      alert(`生徒 (学籍番号: ${specificStudentId}) に通知を送信しました。`);
      setSpecificStudentId('');
    } else {
      alert(`通知の送信に失敗しました: ${result.error}`);
    }
  };

  // Render
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
              setSelectedKana('');
            }}
            className="p-2 ml-2 text-white bg-green-500 rounded cursor-pointer">
            {'生徒カタカナ検索'}
          </button>
        </div>
      </section>

      <section id="table" className="rounded-2xl overflow-hidden mt-2">
        <table className="index-table">
          <thead className="bg-amber-200">
            <tr>
              <th colSpan={3}>
                {studentData ? (
                  <>
                    {'5年'}
                    {studentData?.class}
                    {'組'}
                    {studentData?.number}
                    {'番 '}
                    {studentData?.surname}
                    {studentData?.forename}
                  </>
                ) : (
                  '5年◯組◯番 ◯◯◯◯'
                )}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {/* day1 START */}
            <tr>
              <td rowSpan={2}>
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                  {'１日目'}
                </span>
              </td>
              <td>{'研修先'}</td>
              <td>{studentData ? COURSES_DAY1.find((x) => x.key === studentData?.day1id)?.name : '◯◯◯◯◯◯◯◯'}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{studentData ? studentData.day1bus : '◯◯'}</td>
            </tr>
            {/* day1 END */}
            {/* day2 START */}
            <tr>
              <td rowSpan={1}>
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                  {'２日目'}
                </span>
              </td>
              <td>{''}</td>
              <td>{'班別自由行動'}</td>
            </tr>
            {/* day2 END */}
            {/* day3 START */}
            <tr>
              <td rowSpan={3}>
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                  {'３日目'}
                </span>
              </td>
              <td>{'研修先'}</td>
              <td>{studentData ? COURSES_DAY3.find((x) => x.key === studentData?.day3id)?.name : '◯◯◯◯◯◯◯◯'}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{studentData ? studentData.day3bus : '◯◯'}</td>
            </tr>
            <tr>
              <td>{'お楽しみ会'}</td>
              <td
                className="bg-gray-200 cursor-pointer"
                onClick={() => {
                  navigate('/otanoshimi');
                }}>
                {'詳細はここをクリック！'}
              </td>
            </tr>
            {/* day3 END */}
            {/* day4 START */}
            <tr>
              <td rowSpan={1}>
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                  {'４日目'}
                </span>
              </td>
              <td>{'研修先'}</td>
              <td>
                {studentData ? (
                  <>
                    <p>
                      {studentData?.class}
                      {'組 '}
                      {COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(studentData?.class) - 1])?.name}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {'引率: '}
                      {DAY4_TEACHERS[Number(studentData?.class) - 1]}
                    </p>
                  </>
                ) : (
                  <>
                    <p>{'◯組 ◯◯◯◯◯◯◯◯'}</p>
                    <p className="text-gray-600 text-sm">{'引率: ◯◯先生 ◯◯先生 ◯◯先生'}</p>
                  </>
                )}
              </td>
            </tr>
            {/* day4 END */}
            {/* hotel START */}
            <tr>
              <td rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                {'ホテル'}
              </td>
              <td>
                <p>{'1泊目'}</p>
                <p>{'2泊目'}</p>
              </td>
              <td>
                <p>{'東京ドームホテル'}</p>
                <p>
                  {studentData ? (
                    <>
                      {studentData?.room_tokyo}
                      {'号室'}
                    </>
                  ) : (
                    '◯◯◯号室'
                  )}
                </p>
              </td>
            </tr>
            <tr>
              <td>{'3泊目'}</td>
              <td>
                <p>{'フジプレミアムリゾート'}</p>
                <p>
                  {studentData ? (
                    <>
                      {studentData?.room_shizuoka}
                      {'号室'}
                    </>
                  ) : (
                    '◯◯◯号室'
                  )}
                </p>
              </td>
            </tr>
            {/* hotel END */}
            {/* shinkansen START */}
            <tr>
              <td rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                {'新幹線'}
              </td>
              <td>
                <p>{'1日目'}</p>
                <p className="text-sm">{'新横浜駅で下車'}</p>
              </td>
              <td
                className="bg-gray-200 cursor-pointer"
                onClick={() => {
                  window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=84', '_blank', 'noreferrer');
                }}>
                {studentData ? (
                  <>
                    <p>
                      {'東京駅行 のぞみ84号 - '}
                      {studentData?.shinkansen_day1_car_number}
                      {'号車 '}
                      {studentData?.shinkansen_day1_seat}
                    </p>
                    <p className="text-gray-600 text-sm">{'広島駅7:57発 - 新横浜駅11:34着'}</p>
                    <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                  </>
                ) : (
                  <>
                    <p>{'東京駅行 のぞみ84号 - ◯号車 ◯◯'}</p>
                    <p className="text-gray-600 text-sm">{'広島駅7:57発 - 新横浜駅11:34着'}</p>
                    <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                  </>
                )}
              </td>
            </tr>
            <tr>
              <td>
                <p>{'4日目'}</p>
                <p className="text-sm">{'新横浜駅で乗車'}</p>
              </td>
              <td
                className={'bg-gray-200 cursor-pointer'}
                onClick={() => {
                  window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=77', '_blank', 'noreferrer');
                }}>
                {studentData ? (
                  <>
                    <p>
                      {'広島駅行 のぞみ77号 - '}
                      {studentData?.shinkansen_day4_car_number}
                      {'号車 '}
                      {studentData?.shinkansen_day4_seat}
                    </p>
                    <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
                    <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                  </>
                ) : (
                  <>
                    <p>{'広島駅行 のぞみ77号 - ◯号車 ◯◯'}</p>
                    <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
                    <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                  </>
                )}
              </td>
            </tr>
            {/* shinkansen END */}
          </tbody>
        </table>
      </section>

      <section id="call" className="m-2 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-md">
          <p className="m-[10px] text-2xl font-bold">{'点呼システム'}</p>
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
              <label htmlFor="target_students" className="block text-gray-700 text-sm font-bold mb-2">
                {'対象の生徒 (全員に送信)'}
              </label>
              <select
                name="target_students"
                id="target_students"
                disabled
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-gray-200">
                <option value="all">{"全員"}</option>
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
              <p className="text-xs text-gray-600 mt-1">
                {'ここに学籍番号を入力すると、その生徒にのみ通知が送信されます。空の場合は、上で選択中の生徒に送信されます。'}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <button
                type="submit"
                className="p-2 px-4 text-white bg-blue-500 rounded hover:bg-blue-700 focus:outline-none focus:shadow-outline cursor-pointer">
                {'呼び出し'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <KanaSearchModal
        isOpen={isKanaSearchVisible}
        onClose={() => setKanaSearchVisible(false)}
        onKanaSelect={handleKanaSelect}
        surnameStudents={filteredBySurnameKana}
        forenameStudents={filteredByForenameKana}
        onStudentSelect={handleStudentSelect}
      />
    </div>
  );
};

export default TeacherIndex;
