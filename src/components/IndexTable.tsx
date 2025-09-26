import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4, DAY4_DATA } from '../data/courses';
import { type StudentDTO } from '../helpers/domainApi';
import type { Teacher } from '../interface/models';
import '../styles/index-table.css';
import ModernTable from './ModernTable';
import VerticalLabel from './VerticalLabel';
import { useEffect, useState, useCallback, useMemo, memo } from 'react';
// テーブル行のメモ化
const MemoRow = memo(function MemoRow({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props}>{children}</tr>;
});
// import { useNavigate } from 'react-router-dom';
import RoomDataModal from './RoomDataModal';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { usePrefetchNavigate } from '../prefetch/usePrefetchNavigate';
import { useAuth } from '../auth-context';
import { appFetch } from '../helpers/apiClient';
import { CacheKeys } from '../helpers/cacheKeys';
import type { Roommate, IndexTeacher } from '../interface/models';
import { TEACHERS_DAY2 } from '../data/teachers';

// 型は interface/models に移動 (IndexTeacher / Roommate)

interface IndexTableProps {
  studentData?: StudentDTO | null;
  teacherData?: Teacher | null;
  isStudentSearch?: boolean;
}

const IndexTable = ({ studentData = null, teacherData = null, isStudentSearch = false }: IndexTableProps) => {
  // useNavigateは他セルで今後使う可能性があるが現状未使用のため削除
  const { navigateWithPrefetch } = usePrefetchNavigate();
  // const navigate = useNavigate();
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
          <MemoRow>
            <td rowSpan={isStudentSearch ? 2 : 4} className="vcell vcell--min day-col">
              <VerticalLabel text="各種資料" />
            </td>
          </MemoRow>
          <MemoRow>
            <td className="label-cell">{'行程表'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                if (studentData) {
                  if (isStudentSearch) {
                    navigateWithPrefetch({
                      to: `/yotei?user=${studentData.gakuseki}`,
                      key: 'yoteiStudent',
                      fetcher: async () => appFetch(`${SERVER_ENDPOINT}/api/students/${studentData.gakuseki}`, { requiresAuth: true })
                    });
                  } else {
                    navigateWithPrefetch({
                      to: '/yotei',
                      key: 'yoteiStudent',
                      fetcher: async () => appFetch(`${SERVER_ENDPOINT}/api/students`, { requiresAuth: true })
                    });
                  }
                } else if (teacherData) {
                  navigateWithPrefetch({
                    to: '/yotei',
                    key: 'studentIndexData',
                    fetcher: async () => appFetch(`${SERVER_ENDPOINT}/api/teachers`, { requiresAuth: true })
                  });
                }
              }}>
              {isStudentSearch ? (studentData ? `${studentData.surname} ${studentData.forename} ` : '◯◯◯◯') : 'あなた'}
              {'の行程表をcheck！'}
            </td>
          </MemoRow>
          {!isStudentSearch && (
            <>
              <tr>
                <td className="label-cell">{'マップ'}</td>
                <td
                  className="cell-interactive"
                  onClick={() => {
                    navigateWithPrefetch({
                      to: '/maps',
                      key: 'mapsPage',
                      fetcher: async () => Promise.resolve(null)
                    });
                  }}>
                  {'マップをチェック！'}
                </td>
              </tr>
              <tr>
                <td className="label-cell">{'持ち物'}</td>
                <td
                  className="cell-interactive"
                  onClick={() => {
                    navigateWithPrefetch({
                      to: '/goods',
                      key: 'goodsPage',
                      fetcher: async () => Promise.resolve(null)
                    });
                  }}>
                  {'持ち物を確認しましょう！'}
                </td>
              </tr>
            </>
          )}
          {/* info END */}
          {/* day1 START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2} className="vcell day-col">
              <VerticalLabel text="１日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>
              <p>{(studentData && COURSES_DAY1.find((x) => x.key === studentData.day1id)?.name) || (teacherData && COURSES_DAY1.find((x) => x.key === teacherData.day1id)?.name) || '◯◯◯◯◯◯◯◯'}</p>
              <div className="flex flex-row">
                <p className="text-gray-600 text-xs px-1 items-center justify-center">
                  {'引率: '}
                  {(studentData && teachers.filter((teacher) => teacher.day1id === studentData.day1id).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`)) ||
                    (teacherData && teachers.filter((teacher) => teacher.day1id === teacherData.day1id).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`))}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{(studentData && `${studentData.day1bus}号車`) || (teacherData && `${teacherData.day1bus ?? '◯◯'}号車`) || '◯◯号車'}</td>
          </tr>
          {/* day1 END */}
          {/* day2 START */}
          <tr>
            <td rowSpan={teacherData ? 3 : 2} className="vcell vcell--min day-col">
              <VerticalLabel text="２日目" />
            </td>
            <td className="label-cell">{studentData && (studentData.day2num >= 10 ? `${studentData.day2num / 10}班 班長` : `${studentData.day2num}班`)}</td>
            <td>{'班別自由行動'}</td>
          </tr>
          <tr>
            <td className="label-cell">{'班の一覧'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigateWithPrefetch({
                  to: '/day2',
                  key: 'day2List',
                  fetcher: async () => appFetch(`${SERVER_ENDPOINT}/api/students`, { requiresAuth: true })
                });
              }}>
              {'班の一覧をチェック！'}
            </td>
          </tr>
          {teacherData && (
            <tr>
              <td className="label-cell">{'担当位置'}</td>
              <td>{TEACHERS_DAY2[teacherData.day2]}</td>
            </tr>
          )}
          {/* day2 END */}
          {/* day3 START */}
          <tr>
            <td rowSpan={(studentData && studentData.day3id === 'okutama') || teacherData ? (isStudentSearch ? 3 : 4) : isStudentSearch ? 2 : 3} className="vcell day-col">
              <VerticalLabel text="３日目" />
            </td>
            <td className="label-cell">{'研修先'}</td>
            <td>
              <p>{(studentData && COURSES_DAY3.find((x) => x.key === studentData.day3id)?.name) || (teacherData && COURSES_DAY3.find((x) => x.key === teacherData.day3id)?.name) || '◯◯◯◯◯◯◯◯'}</p>
              <div className="flex flex-row">
                <p className="text-gray-600 text-xs px-1 items-center justify-center">
                  {'引率: '}
                  {(studentData && teachers.filter((teacher) => teacher.day3id === studentData.day3id).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`)) ||
                    (teacherData && teachers.filter((teacher) => teacher.day3id === teacherData.day3id).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`))}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{(studentData && `${studentData.day3bus}号車`) || (teacherData && `${teacherData.day3bus ?? '◯◯'}号車`) || '◯◯号車'}</td>
          </tr>
          {((studentData && studentData.day3id === 'okutama') || teacherData) && (
            <tr>
              <td className="label-cell">{'ボート割'}</td>
              <td
                className="cell-interactive"
                onClick={() =>
                  navigateWithPrefetch({
                    to: '/boats',
                    key: 'boatsList',
                    fetcher: async () => appFetch(`${SERVER_ENDPOINT}/api/boats`, { requiresAuth: true, alwaysFetch: true })
                  })
                }>
                ﾗﾌﾃｨﾝｸﾞのボート割をチェック！
              </td>
            </tr>
          )}
          {!isStudentSearch && (
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
          )}
          {/* day3 END */}
          {/* day4 START */}
          <tr>
            <td rowSpan={2} className="vcell vcell--min day-col">
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
                    <p className="text-gray-600 text-xs px-1 items-center justify-center">
                      {'引率: '}
                      {teachers.filter((teacher) => teacher.day4class === studentData.class).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`)}
                    </p>
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
                    <div className="flex flex-row">
                      <div className="text-gray-600 text-xs px-1 items-center justify-center">
                        {'引率: '}
                        {teachers.filter((teacher) => teacher.day4class === teacherData.day4class).map((teacher) => `${teacher.surname} ${teacher.forename} 先生${'　'}`)}
                      </div>
                    </div>
                  </>
                )) || (
                  <>
                    <p>{'◯組 ◯◯◯◯◯◯◯◯'}</p>
                    <p className="text-gray-600 text-xs">{'引率: ◯◯先生 ◯◯先生 ◯◯先生'}</p>
                  </>
                )}
            </td>
          </tr>
          <tr>
            <td className="label-cell">{'バス'}</td>
            <td>{(studentData && `${studentData.class}号車`) || (teacherData && `${teacherData.day4class ?? '◯◯'}号車`) || '◯◯号車'}</td>
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
                    {studentData.room_tdh >= 1000 ? studentData.room_tdh.toString().substring(0, 2) : studentData.room_tdh.toString().substring(0, 1)}
                    {'階 '}
                    {studentData.room_tdh}
                    {'号室'}
                  </>
                )) ||
                  (teacherData && (
                    <>
                      {teacherData.room_tdh ? (
                        <>
                          {teacherData.room_tdh >= 1000 ? teacherData.room_tdh.toString().substring(0, 2) : teacherData.room_tdh.toString().substring(0, 1)}
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
                    {'ホテル スポルシオン '}
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
                          {'ホテル スポルシオン '}
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
                if (!isStudentSearch) {
                  navigateWithPrefetch({
                    to: '/shinkansen?tab=day1',
                    key: 'shinkansenDay1',
                    fetcher: async () => Promise.resolve(null)
                  });
                }
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
                if (!isStudentSearch) {
                  navigateWithPrefetch({
                    to: '/shinkansen?tab=day4',
                    key: 'shinkansenDay4',
                    fetcher: async () => Promise.resolve(null)
                  });
                }
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
