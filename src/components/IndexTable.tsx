import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4, DAY4_DATA } from '../data/courses';
import { UI_ANIMATION } from '../config/constants';
import type { StudentDTO } from '../helpers/domainApi';
import '../styles/index-table.css';
import { useEffect, useState, useCallback, useMemo } from 'react';
import RoomDataModal from './RoomDataModal';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';
import { usePrefetchNavigate } from '../prefetch/usePrefetchNavigate';
import { useAuth } from '../auth-context';
import { appFetch } from '../helpers/apiClient';
import { CacheKeys } from '../helpers/cacheKeys';
import type { Roommate, IndexTeacher } from '../interface/models';

// 型は interface/models に移動 (IndexTeacher / Roommate)

interface IndexTableProps {
  studentData: StudentDTO | null;
}

const IndexTable = ({ studentData }: IndexTableProps) => {
  // useNavigateは他セルで今後使う可能性があるが現状未使用のため削除
  const { navigateWithPrefetch } = usePrefetchNavigate();
  const { token } = useAuth();
  const [showRoommateModal, setShowRoommateModal] = useState(false);
  const [currentRoommates, setCurrentRoommates] = useState<Roommate[]>([]);
  const [currentHotelName, setCurrentHotelName] = useState('');
  const [currentRoomNumber, setCurrentRoomNumber] = useState('');
  const [teachers, setTeachers] = useState<IndexTeacher[]>([]);
  const hasStudent = !!studentData;

  useEffect(() => {
    if (showRoommateModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showRoommateModal]);

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

  // 閉じアニメ完了後に関連データをクリア (600ms + 余裕)
  useEffect(() => {
    if (!showRoommateModal && (currentRoommates.length > 0 || currentHotelName || currentRoomNumber)) {
      const t = setTimeout(() => {
        setCurrentRoommates([]);
        setCurrentHotelName('');
        setCurrentRoomNumber('');
      }, UI_ANIMATION.modal.dialogMs + UI_ANIMATION.modal.dataClearExtraMs);
      return () => clearTimeout(t);
    }
  }, [showRoommateModal, currentRoommates.length, currentHotelName, currentRoomNumber]);

  const day4CourseName = useMemo(() => {
    if (!hasStudent) return null;
    return COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(studentData!.class) - 1])?.name;
  }, [hasStudent, studentData]);

  // rowspan(2) の2行目をホバーした時にも左端(縦書き)セルをハイライトさせるためのヘルパー
  const addHover = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('rowspan-hover');
  };
  const removeHover = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('rowspan-hover');
  };

  return (
    <section id="table" className="index-table-wrapper m-2">
      <table className="table-base table-rounded table-shadow index-table">
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
              ) : (
                '5年◯組◯番 ◯◯◯◯'
              )}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* day1 START */}
          <tr>
            <td id="day1-rowspan" rowSpan={2}>
              <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                {'１日目'}
              </span>
            </td>
            <td>{'研修先'}</td>
            <td>{hasStudent ? COURSES_DAY1.find((x) => x.key === studentData!.day1id)?.name : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr onMouseEnter={() => addHover('day1-rowspan')} onMouseLeave={() => removeHover('day1-rowspan')}>
            <td>{'バス号車'}</td>
            <td>{hasStudent ? studentData!.day1bus : '◯◯'}</td>
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
            <td>{hasStudent ? COURSES_DAY3.find((x) => x.key === studentData!.day3id)?.name : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td>{'バス号車'}</td>
            <td>{hasStudent ? studentData!.day3bus : '◯◯'}</td>
          </tr>
          <tr>
            <td>{'お楽しみ会'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                navigateWithPrefetch({
                  to: '/otanoshimi',
                  key: 'otanoshimiTeams',
                  fetcher: async () => {
                    // 相対パス '/api/otanoshimi' だと Vite 開発サーバー (5173) 側で 404 になるため、
                    // 明示的に API エンドポイント + 認証付きで取得する。
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
            <td rowSpan={1}>
              <span style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
                {'４日目'}
              </span>
            </td>
            <td>{'研修先'}</td>
            <td>
              {hasStudent ? (
                <>
                  <p>
                    {studentData!.class}
                    {'組 '}
                    {day4CourseName}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {'引率: '}
                    {teachers
                      .filter((teacher) => teacher.day4class === studentData!.class)
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
            <td id="hotel-rowspan" rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
              {'ホテル'}
            </td>
            <td>
              <p>{'1泊目'}</p>
              <p>{'2泊目'}</p>
            </td>
            <td
              className="cell-interactive"
              onClick={() => {
                if (studentData?.room_tdh) {
                  fetchRoommates('tdh', studentData.room_tdh.toString(), '東京ドームホテル');
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
                ) : (
                  '◯階 ◯◯◯号室'
                )}
              </p>
            </td>
          </tr>
          <tr onMouseEnter={() => addHover('hotel-rowspan')} onMouseLeave={() => removeHover('hotel-rowspan')}>
            <td>{'3泊目'}</td>
            <td
              className="cell-interactive"
              onClick={() => {
                if (studentData?.room_fpr) {
                  fetchRoommates('fpr', studentData.room_fpr.toString(), 'フジプレミアムリゾート');
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
                ) : (
                  '◯◯◯号室'
                )}
              </p>
            </td>
          </tr>
          {/* hotel END */}
          {/* shinkansen START */}
          <tr>
            <td id="shinkansen-rowspan" rowSpan={2} style={{ writingMode: 'vertical-rl', textOrientation: 'upright', textAlign: 'center' }} className="align-middle">
              {'新幹線'}
            </td>
            <td>
              <p>{'1日目'}</p>
              <p className="text-sm">{'新横浜駅で下車'}</p>
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
              ) : (
                <>
                  <p>{'広島駅行 のぞみ84号 - ◯号車 ◯◯'}</p>
                  <p className="text-gray-600 text-sm">{'新横浜駅15:48発 - 広島駅19:46着'}</p>
                  <p className="text-gray-600 text-xs">{'クリックすると、JR東海のページが開きます'}</p>
                </>
              )}
            </td>
          </tr>
          <tr onMouseEnter={() => addHover('shinkansen-rowspan')} onMouseLeave={() => removeHover('shinkansen-rowspan')}>
            <td>
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
      <RoomDataModal isOpen={showRoommateModal} roommates={currentRoommates} onClose={handleCloseModal} hotelName={currentHotelName} roomNumber={currentRoomNumber} />
    </section>
  );
};

export default IndexTable;
