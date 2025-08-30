import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../data/courses';
import '../styles/index-table.css';
import { DAY4_DATA, DAY4_TEACHERS } from '../data/day4';
import KanaSearchModal from '../components/KanaSearchModal';

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

  // Effects
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchAllStudents = async () => {
      const db = getFirestore();
      const q = query(collection(db, 'students'), orderBy('gakuseki'));
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map((doc) => doc.data() as student);
      setAllStudents(students);
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
  }

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
        <div className='flex flex-col items-center'>
            <button onClick={() => {setKanaSearchVisible(true); setSelectedKana('');}} className="p-2 ml-2 text-white bg-green-500 rounded cursor-pointer">
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
                <p>{studentData ? <>{studentData?.room_tokyo}{'号室'}</> : '◯◯◯号室'}</p>
              </td>
            </tr>
            <tr>
              <td>{'3泊目'}</td>
              <td>
                <p>{'フジプレミアムリゾート'}</p>
                <p>{studentData ? <>{studentData?.room_shizuoka}{'号室'}</> : '◯◯◯号室'}</p>
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
                    <p>
                      {'東京駅行 のぞみ84号 - ◯号車 ◯◯'}
                    </p>
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
                className={"bg-gray-200 cursor-pointer"}
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
                    <p>
                      {'広島駅行 のぞみ77号 - ◯号車 ◯◯'}
                    </p>
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
