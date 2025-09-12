import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4, DAY4_DATA } from '../data/courses';
import type { StudentDTO } from '../helpers/domainApi';
import type { Teacher } from '../interface/models';
import '../styles/index-table.css';
import ModernTable from './ModernTable';
import VerticalLabel from './VerticalLabel';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomDataModal from './RoomDataModal';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { usePrefetchNavigate } from '../prefetch/usePrefetchNavigate';
import { useAuth } from '../auth-context';
import { appFetch } from '../helpers/apiClient';
import { CacheKeys } from '../helpers/cacheKeys';
import type { Roommate, IndexTeacher } from '../interface/models';

// 型は interface/models に移動 (IndexTeacher / Roommate)

interface IndexTableProps {
  studentData?: StudentDTO | null;
  teacherData?: Teacher | null;
}

const IndexTable = ({ studentData = null, teacherData = null }: IndexTableProps) => {
  // useNavigateは他セルで今後使う可能性があるが現状未使用のため削除
  const { navigateWithPrefetch } = usePrefetchNavigate();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [showRoommateModal, setShowRoommateModal] = useState(false);
  const [currentRoommates, setCurrentRoommates] = useState<Roommate[]>([]);
  const [currentHotelName, setCurrentHotelName] = useState('');
  const [currentRoomNumber, setCurrentRoomNumber] = useState('');
  const [teachers, setTeachers] = useState<IndexTeacher[]>([]);
  const hasStudent = !!studentData;
  const isTeacher = !!teacherData;

  // スクロールは Modal 側でロック・復元を一元管理する（ここでは触らない）

  const tokyoDay1 = ['astro', 'arda', 'urth_jip', 'micro', 'air'];

  const fetchTeachers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await appFetch<IndexTeacher[]>(`${SERVER_ENDPOINT}/api/teachers`, { requiresAuth: true, cacheKey: CacheKeys.teachers.list });
      setTeachers(data);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const fetchRoommates = useCallback(
    async (hotel: 'tdh' | 'fpr', room: string, hotelName: string) => {
      if (!token) return;
      try {
        const data = await appFetch<Roommate[]>(`${SERVER_ENDPOINT}/api/students/roommates/${hotel}/${room}`, { requiresAuth: true, alwaysFetch: true });
        setCurrentRoommates(data);
        setCurrentHotelName(hotelName);
        setCurrentRoomNumber(room);
        setShowRoommateModal(true);
      } catch (error) {
        console.error('Error fetching roommates:', error);
      }
    },
    [token]
  );

  const handleCloseModal = useCallback(() => {
    // アニメーションのためデータは即時クリアしない
    setShowRoommateModal(false);
  }, []);

  // モーダルの閉じアニメ完了後に関連データをクリア
  const handleModalClosed = useCallback(() => {
    setCurrentRoommates([]);
    setCurrentHotelName('');
    setCurrentRoomNumber('');
  }, []);

  const day4CourseName = useMemo(() => {
    if (hasStudent) {
      return COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(studentData!.class) - 1])?.name || null;
    }
    if (isTeacher) {
      const cls = Number(teacherData!.day4class || 0);
      if (!cls) return null;
      return COURSES_DAY4.find((x) => x.key === DAY4_DATA[cls - 1])?.name || null;
    }
    return null;
  }, [hasStudent, isTeacher, studentData, teacherData]);

  return (
    <section id="table" className="index-table-wrapper m-2">
      <ModernTable className="index-table">
        <colgroup>
          <col className="col-day" />
          <col className="col-label" />
          <col className="col-value" />
        </colgroup>
        <thead>
          <tr>
            <th colSpan={3}>
              {hasStudent ? (
                <>
                  {'5年'}
                  {studentData!.class}
                  {'組'}
                  {studentData!.number}
                  {'番 '}
                  {studentData!.surname}
                  {studentData!.forename}
                </>
              ) : isTeacher && teacherData ? (
                <>
                  {teacherData.surname} {teacherData.forename}
                </>
              ) : (
                '5年◯組◯番 ◯◯◯◯'
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* yotei START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="予定表" />
            </td>
            <td className="label-cell" colSpan={2}>
              {'修学旅行 全行程表'}
            </td>
          </tr>
          <tr>
            <td className="label-cell">{''}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/yotei');
              }}>
              {'行程表をチェック！'}
            </td>
          </tr>
          {/* yotei END */}
          {/* map START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="マップ" />
            </td>
            <td className="label-cell" colSpan={2}>
              {'修学旅行 関連マップ'}
            </td>
          </tr>
          <tr>
            <td className="label-cell">{''}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/maps');
              }}>
              {'マップをチェック！'}
            </td>
          </tr>
          {/* map END */}
          {/* day1 START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="１日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>{hasStudent ? COURSES_DAY1.find((x) => x.key === studentData!.day1id)?.name : isTeacher ? COURSES_DAY1.find((x) => x.key === teacherData?.day1id)?.name || '◯◯◯◯◯◯◯◯' : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{hasStudent ? `${studentData!.day1bus}号車` : isTeacher ? `${teacherData?.day1bus ?? '◯◯'}号車` : '◯◯号車'}</td>
          </tr>
          {/* day1 END */}
          {/* day2 START */}
          <tr>
            <td rowSpan={1} className="vcell vcell--min day-col">
              <VerticalLabel text="２日目" />
            </td>
            <td className="label-cell">{''}</td>
            <td>{'班別自由行動'}</td>
          </tr>
          {/* day2 END */}
          {/* day3 START */}
          <tr>
            <td rowSpan={3} className="vcell day-col">
              <VerticalLabel text="３日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>{hasStudent ? COURSES_DAY3.find((x) => x.key === studentData!.day3id)?.name : isTeacher ? COURSES_DAY3.find((x) => x.key === teacherData?.day3id)?.name || '◯◯◯◯◯◯◯◯' : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{hasStudent ? `${studentData!.day3bus}号車` : isTeacher ? `${teacherData?.day3bus ?? '◯◯'}号車` : '◯◯号車'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'お楽しみ会'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigateWithPrefetch({
                  to: '/otanoshimi',
                  key: 'otanoshimiTeams',
                  fetcher: async () => {
                    return appFetch(`${SERVER_ENDPOINT}/api/otanoshimi`, { requiresAuth: true, alwaysFetch: true });
                  },
                  awaitFetch: true
                });
              }}>
              {'詳細はここをクリック！'}
            </td>
          </tr>
          {/* day3 END */}
          {/* day4 START */}
          <tr>
            <td rowSpan={1} className="vcell vcell--min day-col">
              <VerticalLabel text="４日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>
              {hasStudent ? (
                <>
                  <p>
                    {studentData!.class}
                    {'組 '}
                    {day4CourseName}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {'引率: '}
                    {teachers
                      .filter((teacher) => teacher.day4class === studentData!.class)
                      .map((teacher) => `${teacher.surname}${teacher.forename}先生`)
                      .join(' ')}
                  </p>
                </>
              ) : isTeacher ? (
                <>
                  <p>
                    {teacherData?.day4class}
                    {'組 '}
                    {day4CourseName}
                  </p>
                  <p className="text-gray-600 text-xs">
                    {'引率: '}
                    {teachers
                      .filter((t) => t.day4class === teacherData?.day4class)
                      .map((t) => `${t.surname}${t.forename}先生`)
                      .join(' ')}
                  </p>
                </>
              ) : (
                <>
                  <p>{'◯組 ◯◯◯◯◯◯◯◯'}</p>
                  <p className="text-gray-600 text-xs">{'引率: ◯◯先生 ◯◯先生 ◯◯先生'}</p>
                </>
              )}
            </td>
          </tr>
          {/* day4 END */}
          {/* hotel START */}
          <tr>
            <td id="hotel-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="ホテル" />
            </td>
            <td className="label-cell">
              <p>{'1泊目'}</p>
              <p>{'2泊目'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                if (studentData?.room_tdh) {
                  fetchRoommates('tdh', studentData.room_tdh.toString(), '東京ドームホテル');
                } else if (teacherData?.room_tdh) {
                  fetchRoommates('tdh', teacherData.room_tdh.toString(), '東京ドームホテル');
                }
              }}>
              <p>{'東京ドームホテル'}</p>
              <p>
                {hasStudent ? (
                  <>
                    {studentData!.room_tdh.toString().substring(0, 2)}
                    {'階 '}
                    {studentData!.room_tdh}
                    {'号室'}
                  </>
                ) : isTeacher ? (
                  <>
                    {teacherData?.room_tdh ? (
                      <>
                        {teacherData.room_tdh.toString().substring(0, 2)}
                        {'階 '}
                        {teacherData.room_tdh}
                        {'号室'}
                      </>
                    ) : (
                      '◯階 ◯◯◯号室'
                    )}
                  </>
                ) : (
                  '◯階 ◯◯◯号室'
                )}
              </p>
            </td>
          </tr>
          <tr>
            <td className="label-cell">
              <p>{'3泊目'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                if (studentData?.room_fpr) {
                  fetchRoommates('fpr', studentData.room_fpr.toString(), 'フジプレミアムリゾート');
                } else if (teacherData?.room_fpr) {
                  fetchRoommates('fpr', teacherData.room_fpr.toString(), 'フジプレミアムリゾート');
                }
              }}>
              <p>{'フジプレミアムリゾート'}</p>
              <p>
                {hasStudent ? (
                  <>
                    {'Hotel Spor:Sion '}
                    {studentData!.room_fpr.toString().substring(1, 2)}
                    {'階 '}
                    {studentData!.room_fpr}
                    {'号室'}
                  </>
                ) : isTeacher ? (
                  <>
                    {teacherData?.room_fpr ? (
                      <>
                        {'Hotel Spor:Sion '}
                        {teacherData.room_fpr.toString().substring(1, 2)}
                        {'階 '}
                        {teacherData.room_fpr}
                        {'号室'}
                      </>
                    ) : (
                      '◯◯◯号室'
                    )}
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
            <td id="shinkansen-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="新幹線" />
            </td>
            <td className="label-cell">
              <p>{'1日目'}</p>
              <p className="text-sm">{(studentData && tokyoDay1.includes(studentData.day1id)) || (teacherData && tokyoDay1.includes(teacherData.day1id)) ? '東京駅で下車' : '新横浜駅で下車'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=84', '_blank', 'noreferrer');
              }}>
              {hasStudent ? (
                <>
                  <p>
                    {'東京駅行 のぞみ84号 - '}
                    {studentData!.shinkansen_day1_car_number}
                    {'号車 '}
                    {studentData!.shinkansen_day1_seat}
                  </p>
                  <p className="text-gray-600 text-sm">{'広島駅7:57発 - 新横浜駅11:34着'}</p>
                  <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                </>
              ) : isTeacher ? (
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
            <td className="label-cell">
              <p>{'4日目'}</p>
              <p className="text-sm">{'新横浜駅で乗車'}</p>
            </td>
            <td
              className={'cell-interactive'}
              onClick={() => {
                window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=77', '_blank', 'noreferrer');
              }}>
              {hasStudent ? (
                <>
                  <p>
                    {'広島駅行 のぞみ77号 - '}
                    {studentData!.shinkansen_day4_car_number}
                    {'号車 '}
                    {studentData!.shinkansen_day4_seat}
                  </p>
                  <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
                  <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                </>
              ) : isTeacher ? (
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
      </ModernTable>
      <RoomDataModal isOpen={showRoommateModal} roommates={currentRoommates} onClose={handleCloseModal} onClosed={handleModalClosed} hotelName={currentHotelName} roomNumber={currentRoomNumber} />
    </section>
  );
};

export default IndexTable;
