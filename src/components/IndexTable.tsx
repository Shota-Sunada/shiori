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

  const showRoomDetail = useCallback(
    async (hotel: 'tdh' | 'fpr', room: string, hotelName: string, forTeacher: boolean = false) => {
      if (!token) return;
      try {
        if (forTeacher) {
          setCurrentHotelName(hotelName);
          setCurrentRoomNumber(room);
          setShowRoommateModal(true);
        } else {
          const data = await appFetch<Roommate[]>(`${SERVER_ENDPOINT}/api/students/roommates/${hotel}/${room}`, { requiresAuth: true, alwaysFetch: true });
          setCurrentRoommates(data);
          setCurrentHotelName(hotelName);
          setCurrentRoomNumber(room);
          setShowRoommateModal(true);
        }
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
    if (studentData) {
      return COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(studentData.class) - 1])?.name || null;
    }
    if (teacherData) {
      const cls = Number(teacherData.day4class || 0);
      if (!cls) return null;
      return COURSES_DAY4.find((x) => x.key === DAY4_DATA[cls - 1])?.name || null;
    }
    return null;
  }, [studentData, teacherData]);

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
              {(studentData && (
                <>
                  {'5年'}
                  {studentData.class}
                  {'組'}
                  {studentData.number}
                  {'番 '}
                  {studentData.surname}
                  {studentData.forename}
                </>
              )) ||
                (teacherData && (
                  <>
                    {teacherData.surname} {teacherData.forename}
                  </>
                )) ||
                '5年◯組◯番 ◯◯◯◯'}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* info START */}
          <tr>
            <td rowSpan={4} className="vcell day-col">
              <VerticalLabel text="各種資料" />
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'行程表'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/yotei');
              }}>
              {'あなたの行程表をcheck！'}
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'マップ'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/maps');
              }}>
              {'マップをチェック！'}
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'持ち物'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/goods');
              }}>
              {'持ち物を確認しましょう！'}
            </td>
          </tr>
          {/* info END */}
          {/* day1 START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="１日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>{(studentData && COURSES_DAY1.find((x) => x.key === studentData.day1id)?.name) || (teacherData && COURSES_DAY1.find((x) => x.key === teacherData.day1id)?.name) || '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{(studentData && `${studentData.day1bus}号車`) || (teacherData && `${teacherData.day1bus ?? '◯◯'}号車`) || '◯◯号車'}</td>
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
            <td rowSpan={(studentData && studentData.day3id === 'okutama') || teacherData ? 4 : 3} className="vcell day-col">
              <VerticalLabel text="３日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>{(studentData && COURSES_DAY3.find((x) => x.key === studentData.day3id)?.name) || (teacherData && COURSES_DAY3.find((x) => x.key === teacherData.day3id)?.name) || '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{(studentData && `${studentData.day3bus}号車`) || (teacherData && `${teacherData.day3bus ?? '◯◯'}号車`) || '◯◯号車'}</td>
          </tr>
          {((studentData && studentData.day3id === 'okutama') || teacherData) && (
            <tr>
              <td className="label-cell">{'ボート割'}</td>
              <td className="cell-interactive" onClick={() => navigate('/boats')}>
                ﾗﾌﾃｨﾝｸﾞのボート割をチェック！
              </td>
            </tr>
          )}
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
              {(studentData && (
                <>
                  <p>
                    {studentData.class}
                    {'組 '}
                    {day4CourseName}
                  </p>
                  <div className="flex flex-row">
                    <p className="text-gray-600 text-xs">{'引率: '}</p>
                    <div className="flex flex-row">
                      {teachers
                        .filter((teacher) => teacher.day4class === studentData.class)
                        .map((teacher) => (
                          <p key={teacher.id} className="text-gray-600 text-xs px-1 items-center justify-center">{`${teacher.surname} ${teacher.forename} 先生`}</p>
                        ))}
                    </div>
                  </div>
                </>
              )) ||
                (teacherData && (
                  <>
                    <p>
                      {teacherData.day4class}
                      {'組 '}
                      {day4CourseName}
                    </p>
                    <p className="text-gray-600 text-xs">
                      {'引率: '}
                      {teachers
                        .filter((t) => t.day4class === teacherData.day4class)
                        .map((t) => `${t.surname}${t.forename}先生`)
                        .join(' ')}
                    </p>
                  </>
                )) || (
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
                if (studentData) {
                  showRoomDetail('tdh', studentData.room_tdh.toString(), '東京ドームホテル');
                } else if (teacherData) {
                  showRoomDetail('tdh', teacherData.room_tdh.toString(), '東京ドームホテル', true);
                }
              }}>
              <p>{'東京ドームホテル'}</p>
              <p>
                {(studentData && (
                  <>
                    {studentData.room_tdh.toString().substring(0, 2)}
                    {'階 '}
                    {studentData.room_tdh}
                    {'号室'}
                  </>
                )) ||
                  (teacherData && (
                    <>
                      {teacherData.room_tdh ? (
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
                  )) ||
                  '◯階 ◯◯◯号室'}
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
                if (studentData) {
                  showRoomDetail('fpr', studentData.room_fpr.toString(), 'フジプレミアムリゾート');
                } else if (teacherData) {
                  showRoomDetail('fpr', teacherData.room_fpr.toString(), 'フジプレミアムリゾート', true);
                }
              }}>
              <p>{'フジプレミアムリゾート'}</p>
              <p>
                {(studentData && (
                  <>
                    {'Hotel Spor:Sion '}
                    {studentData.room_fpr.toString().substring(1, 2)}
                    {'階 '}
                    {studentData.room_fpr}
                    {'号室'}
                  </>
                )) ||
                  (teacherData && (
                    <>
                      {teacherData.room_fpr ? (
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
                  )) ||
                  '◯◯◯号室'}
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
              <p>{'１日目'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/shinkansen?tab=day1');
              }}>
              {(studentData && (
                <>
                  <p>
                    {studentData.shinkansen_day1_car_number}
                    {'号車 '}
                    {studentData.shinkansen_day1_seat}
                  </p>
                  <p>クリックして詳細をチェック！</p>
                </>
              )) ||
                (teacherData && (
                  <>
                    <p>
                      {teacherData.shinkansen_day1_car_number}
                      {'号車 '}
                      {teacherData.shinkansen_day1_seat}
                    </p>
                    <p>クリックして詳細をチェック！</p>
                  </>
                ))}
            </td>
          </tr>
          <tr>
            <td className="label-cell">
              <p>{'４日目'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigate('/shinkansen?tab=day4');
              }}>
              {(studentData && (
                <>
                  <p>
                    {studentData.shinkansen_day4_car_number}
                    {'号車 '}
                    {studentData.shinkansen_day4_seat}
                  </p>
                  <p>クリックして詳細をチェック！</p>
                </>
              )) ||
                (teacherData && (
                  <>
                    <p>
                      {teacherData.shinkansen_day4_car_number}
                      {'号車 '}
                      {teacherData.shinkansen_day4_seat}
                    </p>
                    <p>クリックして詳細をチェック！</p>
                  </>
                ))}
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
