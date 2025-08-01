import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';

const Index = () => {
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
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading)
    return (
      <div>
        <p>{'読込中...'}</p>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center pt-[20dvh]">
      <p>
        {'ようこそ、'}
        {studentData?.surname}
        {studentData?.forename}
        {'さん。'}
      </p>

      <section id="table">
        <p>{'個人データ確認表'}</p>
        <table>
          <thead>
            <tr>
              <th colSpan={2}>
                {'5年'}
                {studentData?.class}
                {'組'}
                {studentData?.number}
                {'番 '}
                {studentData?.surname}
                {studentData?.forename}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{'1日目 バス号車'}</td>
              <td>{studentData?.day1bus}</td>
            </tr>
            <tr>
              <td>{'1日目 研修先'}</td>
              <td>{COURSES_DAY1.find((x) => x.key == studentData?.day1id)?.name}</td>
            </tr>
            <tr>
              <td>{'3日目 バス号車'}</td>
              <td>{studentData?.day3bus}</td>
            </tr>
            <tr>
              <td>{'3日目 研修先'}</td>
              <td>{COURSES_DAY3.find((x) => x.key == studentData?.day3id)?.name}</td>
            </tr>
            <tr>
              <td>{'東京ドームホテル 部屋番号'}</td>
              <td>{studentData?.room_tokyo}</td>
            </tr>
            <tr>
              <td>{'静岡 部屋番号'}</td>
              <td>{studentData?.room_shizuoka}</td>
            </tr>
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
                <a href="#shinkansen-up">{'上り (東京行)'}</a>
              </li>
              <li>
                <a href="#shinkansen-down">{'下り (広島行)'}</a>
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
        <h2 id="shinkansen-up">{'新幹線 (上り/東京行)'}</h2>
        <h2 id="shinkansen-down">{'新幹線 (下り/広島行)'}</h2>
      </section>
    </div>
  );
};

export default Index;
