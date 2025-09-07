import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import Button from '../components/Button';
import CenterMessage from '../components/CenterMessage';
import { SERVER_ENDPOINT } from '../App';
import type { Teacher } from './TeacherAdmin';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4, DAY4_DATA } from '../data/courses';

const TeacherIndex = () => {
  const { user, loading, token } = useAuth();
  const navigate = useNavigate();
  const [teacherData, setTeacherData] = useState<Teacher | null>(null);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);

  // 認証チェック
  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  const fetchTeacherData = useCallback(async () => {
    if (!user?.userId || !token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/teachers/${user.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
      const data = await response.json();
      setTeacherData(data);
    } catch (error) {
      console.error('Failed to fetch teacher data:', error);
      setTeacherData(null);
    }
  }, [user?.userId, token]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  const fetchAllTeachers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error(`HTTP error status: ${response.status}`);
      const data: Teacher[] = await response.json();
      setAllTeachers(data);
    } catch (error) {
      console.error('Error fetching all teachers:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchAllTeachers();
  }, [fetchAllTeachers]);

  if (loading || !user) return <CenterMessage>読込中...</CenterMessage>;

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <div className="m-2 flex flex-col items-center justify-center">
        <p className="m-[10px] text-2xl">{'ようこそ、先生用ページへ'}</p>
        <p className="text-xl">
          {teacherData ? `${teacherData.surname} ${teacherData.forename} 先生` : '管理者'}
          {'としてログイン中'}
        </p>
      </div>

      <section id="table" className="rounded-2xl overflow-hidden m-1">
        <table className="index-table">
          <thead className="bg-amber-200">
            <tr>
              <th colSpan={3}>
                {teacherData ? (
                  <>
                    {teacherData?.surname}
                    {teacherData?.forename}
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
              <td>{teacherData ? COURSES_DAY1.find((x) => x.key === teacherData?.day1id)?.name : '◯◯◯◯◯◯◯◯'}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{teacherData ? teacherData.day1bus : '◯◯'}</td>
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
              <td>{teacherData ? COURSES_DAY3.find((x) => x.key === teacherData?.day3id)?.name : '◯◯◯◯◯◯◯◯'}</td>
            </tr>
            <tr>
              <td>{'バス号車'}</td>
              <td>{teacherData ? teacherData.day3bus : '◯◯'}</td>
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
                {teacherData ? (
                  <>
                    <p>
                      {teacherData?.day4class}
                      {'組 '}
                      {COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(teacherData?.day4class) - 1])?.name}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {'引率: '}
                      {allTeachers
                        .filter((teacher) => teacher.day4class === teacherData?.day4class)
                        .map((teacher) => `${teacher.surname}${teacher.forename}先生`)
                        .join(' ')}
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
              <td
                className="cursor-pointer bg-gray-200"
                onClick={() => {
                  if (teacherData?.room_tdh) {
                    // fetchRoommates('tdh', teacherData.room_tdh.toString(), '東京ドームホテル');
                  }
                }}>
                <p>{'東京ドームホテル'}</p>
                <p>
                  {teacherData ? (
                    <>
                      {teacherData?.room_tdh.toString().substring(0, 2)}
                      {'階 '}
                      {teacherData?.room_tdh}
                      {'号室'}
                    </>
                  ) : (
                    '◯階 ◯◯◯号室'
                  )}
                </p>
              </td>
            </tr>
            <tr>
              <td>{'3泊目'}</td>
              <td
                className="cursor-pointer bg-gray-200"
                onClick={() => {
                  if (teacherData?.room_fpr) {
                    // fetchRoommates('fpr', teacherData.room_fpr.toString(), 'フジプレミアムリゾート');
                  }
                }}>
                <p>{'フジプレミアムリゾート'}</p>
                <p>
                  {teacherData ? (
                    <>
                      {'Hotel Spor:Sion '}
                      {teacherData?.room_fpr.toString().substring(1, 2)}
                      {'階 '}
                      {teacherData?.room_fpr}
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
                {teacherData ? (
                  <>
                    <p>
                      {'東京駅行 のぞみ84号 - '}
                      {teacherData?.shinkansen_day1_car_number}
                      {'号車 '}
                      {teacherData?.shinkansen_day1_seat}
                    </p>
                    <p className="text-gray-600 text-sm">{'広島駅7:57発 - 新横浜駅11:34着'}</p>
                    <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                  </>
                ) : (
                  <>
                    <p>{'広島駅行 のぞみ84号 - ◯号車 ◯◯'}</p>
                    <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
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
                {teacherData ? (
                  <>
                    <p>
                      {'広島駅行 のぞみ77号 - '}
                      {teacherData?.shinkansen_day4_car_number}
                      {'号車 '}
                      {teacherData?.shinkansen_day4_seat}
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

      <Button text="生徒を検索" arrowRight link="/teacher/search"></Button>
      <Button text="点呼" arrowRight link="/teacher/call"></Button>
      <Button text="お楽しみ会" arrowRight link="/otanoshimi" color="green"></Button>
    </div>
  );
};

export default TeacherIndex;
