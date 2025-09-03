import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';

const Index = () => {
  const { user, loading } = useAuth();

  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<student | null | undefined>(undefined);

  useEffect(() => {
    const fetchStudent = async () => {
      if (user && user.userId && !user.is_teacher) {
        try {
          const response = await fetch(`${SERVER_ENDPOINT}/api/students/${user.userId}`);
          if (!response.ok) {
            if (response.status === 404) {
              console.warn(`生徒ID「${user.userId}」のデータが見つかりませんでした。`);
              setStudentData(null);
            } else {
              throw new Error(`HTTPエラー! ステータス: ${response.status}`);
            }
          } else {
            const data: student = await response.json();
            setStudentData(data);
          }
        } catch (error) {
          console.error('生徒データの取得に失敗:', error);
          setStudentData(null);
        }
      } else {
        setStudentData(null);
      }
    };

    fetchStudent();
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }

    if (user?.is_teacher) {
      navigate('/teacher');
    }
  }, [user, loading, navigate]);

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

  if (user?.is_teacher) {
    navigate('/teacher');
  }

  if (studentData === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'生徒データ読込中...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      {studentData ? (
        <p className="m-[10px] text-2xl">
          {'ようこそ、'}
          {studentData.surname}
          {studentData.forename}
          {'さん。'}
        </p>
      ) : (
        <div className="m-[10px] flex flex-col items-center justify-center">
          <p className=" text-2xl">{'生徒データが見つかりませんでした。'}</p>
          <p className="text-sm">{'管理者にご連絡ください。'}</p>
        </div>
      )}

      <IndexTable studentData={studentData} />

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
