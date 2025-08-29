import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4 } from '../data/courses';
import '../styles/index-table.css';
import { DAY4_DATA, DAY4_TEACHERS } from '../data/day4';

const Index = (props: { isTeacher: boolean }) => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<student | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (user && user.email) {
        const gakuseki = user.email.split('@')[0];
        const db = getFirestore();
        const q = query(collection(db, 'students'), where('gakuseki', '==', Number(gakuseki)));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setStudentData(snapshot.docs[0].data() as student);
        } else {
          setStudentData(null);
        }
      }
    };

    fetchStudent();
  }, [user, props]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }

    if (props.isTeacher) {
      navigate('/teacher-index');
    }
  }, [user, loading, navigate, props]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'ユーザーデータ読込中...'}</p>
      </div>
    );
  }

  if (props.isTeacher) {
    navigate('/teacher-index');
  }

  if (!studentData) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'生徒データ読込中...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="m-[10px] text-2xl">
        {'ようこそ、'}
        {studentData.surname}
        {studentData.forename}
        {'さん。'}
      </p>

      <section id="table">
        <table className="index-table">
          <thead className="bg-amber-200">
            <tr>
              <th colSpan={3}>
                {'5年'}
                {studentData.class}
                {'組'}
                {studentData.number}
                {'番 '}
                {studentData.surname}
                {studentData.forename}
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
              <td>{COURSES_DAY1.find((x) => x.key === studentData.day1id)?.name}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{studentData.day1bus}</td>
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
              <td>{"班別自由行動"}</td>
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
              <td>{COURSES_DAY3.find((x) => x.key === studentData.day3id)?.name}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{studentData.day3bus}</td>
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
                <p>
                  {studentData.class}
                  {'組 '}
                  {COURSES_DAY4.find((x) => x.key === DAY4_DATA[studentData.class - 1])?.name}
                </p>
                <p className="text-gray-600 text-sm">
                  {'引率: '}
                  {DAY4_TEACHERS[studentData.class - 1]}
                </p>
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
                  {studentData.room_tokyo}
                  {'号室'}
                </p>
              </td>
            </tr>
            <tr>
              <td>{'3泊目'}</td>
              <td>
                <p>{'フジプレミアムリゾート'}</p>
                <p>
                  {studentData.room_shizuoka}
                  {'号室'}
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
                <p>{'東京駅行 のぞみ84号 - '}{studentData.shinkansen_day1_car_number}{"号車 "}{studentData.shinkansen_day1_seat}</p>
                <p className="text-gray-600 text-sm">{'広島駅7:57発 - 新横浜駅11:34着'}</p>
                <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
              </td>
            </tr>
            <tr>
              <td>
                <p>{'4日目'}</p>
                <p className="text-sm">{'新横浜駅で乗車'}</p>
              </td>
              <td
                className="bg-gray-200 cursor-pointer"
                onClick={() => {
                  window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=77', '_blank', 'noreferrer');
                }}>
                <p>{'広島駅行 のぞみ77号 - '}{studentData.shinkansen_day4_car_number}{"号車 "}{studentData.shinkansen_day4_seat}</p>
                <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
                <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
              </td>
            </tr>
            {/* shinkansen END */}
          </tbody>
        </table>
      </section>

      <section id="index">
        <div>{'目次 - 項目をクリックすると、そのページに移動します'}</div>
        <ol>
          <li>
            <p>{'予定表'}</p>
            <ol>
              <li>
                <a href="#day1">{'1日目'}</a>
              </li>
              <li>
                <a href="#day2">{'2日目'}</a>
              </li>
              <li>
                <a href="#day3">{'3日目'}</a>
              </li>
              <li>
                <a href="#day4">{'4日目'}</a>
              </li>
            </ol>
          </li>
          <li>
            <p>{'新幹線 座席表'}</p>
            <ol>
              <li>
                <a href="#shinkansen-nobori">{'上り (東京行)'}</a>
              </li>
              <li>
                <a href="#shinkansen-kudari">{'下り (広島行)'}</a>
              </li>
            </ol>
          </li>
        </ol>
      </section>

      <section id="days">
        <h2 id="day1">{'1日目'}</h2>
        <h2 id="day2">{'2日目'}</h2>
        <h2 id="day3">{'3日目'}</h2>
        <h2 id="day4">{'4日目'}</h2>
      </section>

      <section id="shinkansen">
        <h2 id="shinkansen-nobori">{'新幹線 (上り/東京行)'}</h2>
        <h2 id="shinkansen-kudari">{'新幹線 (下り/広島行)'}</h2>
      </section>
    </div>
  );
};

export default Index;
