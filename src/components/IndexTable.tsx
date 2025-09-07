import { useNavigate } from 'react-router-dom';
import { COURSES_DAY1, COURSES_DAY3, COURSES_DAY4, DAY4_DATA } from '../data/courses';
import type { student } from '../data/students';
import '../styles/index-table.css';
import { useEffect, useState } from 'react';
import RoomDataModal from './RoomDataModal';
import { SERVER_ENDPOINT } from '../App';
import { useAuth } from '../auth-context';

interface Roommate {
  gakuseki: string;
  surname: string;
  forename: string;
  class: number;
  number: number;
}

interface Teacher {
  id: number;
  surname: string;
  forename: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: string;
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: string;
  shinkansen_day4_seat: string;
  day1id: string;
  day1bus: string;
  day3id: string;
  day3bus: string;
  day4class: number;
}

const IndexTable = (props: { studentData: student | null }) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [showRoommateModal, setShowRoommateModal] = useState(false);
  const [currentRoommates, setCurrentRoommates] = useState<Roommate[]>([]);
  const [currentHotelName, setCurrentHotelName] = useState('');
  const [currentRoomNumber, setCurrentRoomNumber] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);

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

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/teachers`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Teacher[] = await response.json();
        setTeachers(data);
      } catch (error) {
        console.error('Error fetching teachers:', error);
      }
    };

    if (token) {
      fetchTeachers();
    }
  }, [token]);

  const fetchRoommates = async (hotel: 'tdh' | 'fpr', room: string, hotelName: string) => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students/roommates/${hotel}/${room}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Roommate[] = await response.json();
      setCurrentRoommates(data);
      setCurrentHotelName(hotelName);
      setCurrentRoomNumber(room);
      setShowRoommateModal(true);
    } catch (error) {
      console.error('Error fetching roommates:', error);
    }
  };

  const handleCloseModal = () => {
    setShowRoommateModal(false);
    setCurrentRoommates([]);
    setCurrentHotelName('');
    setCurrentRoomNumber('');
  };

  return (
    <section id="table" className="rounded-2xl overflow-hidden m-1">
      <table className="index-table">
        <thead className="bg-amber-200">
          <tr>
            <th colSpan={3}>
              {props.studentData ? (
                <>
                  {'5年'}
                  {props.studentData?.class}
                  {'組'}
                  {props.studentData?.number}
                  {'番 '}
                  {props.studentData?.surname}
                  {props.studentData?.forename}
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
            <td>{props.studentData ? COURSES_DAY1.find((x) => x.key === props.studentData?.day1id)?.name : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td>{'バス号車'}</td>
            <td>{props.studentData ? props.studentData.day1bus : '◯◯'}</td>
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
            <td>{props.studentData ? COURSES_DAY3.find((x) => x.key === props.studentData?.day3id)?.name : '◯◯◯◯◯◯◯◯'}</td>
          </tr>
          <tr>
            <td>{'バス号車'}</td>
            <td>{props.studentData ? props.studentData.day3bus : '◯◯'}</td>
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
              {props.studentData ? (
                <>
                  <p>
                    {props.studentData?.class}
                    {'組 '}
                    {COURSES_DAY4.find((x) => x.key === DAY4_DATA[Number(props.studentData?.class) - 1])?.name}
                  </p>
                  <p className="text-gray-600 text-sm">
                    {'引率: '}
                    {teachers
                      .filter((teacher) => teacher.day4class === props.studentData?.class)
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
                if (props.studentData?.room_tdh) {
                  fetchRoommates('tdh', props.studentData.room_tdh.toString(), '東京ドームホテル');
                }
              }}>
              <p>{'東京ドームホテル'}</p>
              <p>
                {props.studentData ? (
                  <>
                    {props.studentData?.room_tdh.toString().substring(0, 2)}
                    {'階 '}
                    {props.studentData?.room_tdh}
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
                if (props.studentData?.room_fpr) {
                  fetchRoommates('fpr', props.studentData.room_fpr.toString(), 'フジプレミアムリゾート');
                }
              }}>
              <p>{'フジプレミアムリゾート'}</p>
              <p>
                {props.studentData ? (
                  <>
                    {'Hotel Spor:Sion '}
                    {props.studentData?.room_fpr.toString().substring(1, 2)}
                    {'階 '}
                    {props.studentData?.room_fpr}
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
              {props.studentData ? (
                <>
                  <p>
                    {'東京駅行 のぞみ84号 - '}
                    {props.studentData?.shinkansen_day1_car_number}
                    {'号車 '}
                    {props.studentData?.shinkansen_day1_seat}
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
              {props.studentData ? (
                <>
                  <p>
                    {'広島駅行 のぞみ77号 - '}
                    {props.studentData?.shinkansen_day4_car_number}
                    {'号車 '}
                    {props.studentData?.shinkansen_day4_seat}
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
      {showRoommateModal ? <RoomDataModal roommates={currentRoommates} onClose={handleCloseModal} hotelName={currentHotelName} roomNumber={currentRoomNumber} /> : <></>}
    </section>
  );
};

export default IndexTable;
