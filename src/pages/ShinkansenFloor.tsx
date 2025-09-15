const FACILITY_COLOR_CLASS: Record<string, [string, string]> = {
  deck: ['デッキ (ドア&ゴミ箱)', 'bg-blue-200 border-blue-400 text-blue-900'],
  driver: ['運転台', 'bg-gray-300 border-gray-400 text-gray-800'],
  wc: ['WC', 'bg-green-100 border-green-300 text-green-800'],
  wash: ['洗面', 'bg-cyan-100 border-cyan-300 text-cyan-800'],
  phone: ['電話', 'bg-yellow-100 border-yellow-300 text-yellow-800'],
  smoking: ['喫煙室', 'bg-red-100 border-red-300 text-red-800']
};

const STAFF_SEAT: { name: string; day1: { car: number; seat: string }; day4: { car: number; seat: string } }[] = [
  { name: 'CAM', day1: { car: 14, seat: '20A' }, day4: { car: 15, seat: '14D' } },
  { name: '添乗員', day1: { car: 13, seat: '9B' }, day4: { car: 13, seat: '9B' } },
  { name: '添乗員', day1: { car: 13, seat: '9C' }, day4: { car: 13, seat: '9C' } },
  { name: '添乗員', day1: { car: 14, seat: '20C' }, day4: { car: 13, seat: '9D' } },
  { name: '添乗員', day1: { car: 15, seat: '16E' }, day4: { car: 13, seat: '9E' } },
  { name: '看護師', day1: { car: 14, seat: '20B' }, day4: { car: 15, seat: '14E' } }
];

function getFacilityLabel(id: string): string {
  return FACILITY_COLOR_CLASS[id][0];
}

function getFacilityColorClass(id: string): string {
  return FACILITY_COLOR_CLASS[id][1] || 'bg-gray-100 border-gray-300 text-gray-700';
}

interface FacilityRowProps {
  facilities: FacilityGroup;
  isTopHiroshima: boolean;
}

const FacilityRow: React.FC<FacilityRowProps> = ({ facilities, isTopHiroshima }) => {
  if (!facilities) return null;

  // 座席表の幅に合わせて6列（A,B,C,通路,D,E）分で調整
  // bothのみ
  if ('both' in facilities) {
    const f = facilities.both;
    return (
      <div className="flex w-full my-1 flex-row gap-0">
        <div
          className={`w-full flex flex-col items-center px-3 py-1 rounded-lg border shadow-sm text-xs font-semibold ${getFacilityColorClass(f)} m-0.5`}
          style={{ minWidth: 'calc(5*4rem + 1.5rem)' }}>
          <span className="text-base leading-none mb-0.5">{getFacilityLabel(f)}</span>
        </div>
      </div>
    );
  }

  // abc/deセット
  const abc = facilities.abc;
  const de = facilities.de;
  // 進行方向で左右を切り替え
  const leftFacility = isTopHiroshima ? abc : de;
  const rightFacility = isTopHiroshima ? de : abc;
  const leftWidth = isTopHiroshima ? '12.25rem' : '8.25rem';
  const rightWidth = isTopHiroshima ? '8.5rem' : '12.5rem';
  return (
    <div className="flex w-full my-1 flex-row gap-0">
      {/* 左側（進行方向でABCまたはDE） */}
      <div className="flex items-center justify-center m-0.5" style={{ width: leftWidth }}>
        <div className={`w-full flex flex-col items-center px-3 py-1 rounded-lg border shadow-sm text-xs font-semibold ${getFacilityColorClass(leftFacility)}`}>
          <span className="text-base leading-none mb-0.5">{getFacilityLabel(leftFacility)}</span>
        </div>
      </div>
      {/* 通路 */}
      <div className="w-6" />
      {/* 右側（進行方向でDEまたはABC） */}
      <div className="flex items-center justify-center m-0.5" style={{ width: rightWidth }}>
        <div className={`w-full flex flex-col items-center px-3 py-1 rounded-lg border shadow-sm text-xs font-semibold ${getFacilityColorClass(rightFacility)}`}>
          <span className="text-base leading-none mb-0.5">{getFacilityLabel(rightFacility)}</span>
        </div>
      </div>
    </div>
  );
};

type FacilityGroup = { abc: string; de: string } | { both: string };
type CarFacilities = {
  front: FacilityGroup[];
  back: FacilityGroup[];
};

const CAR_FACILITIES: Record<number, CarFacilities> = {
  16: {
    front: [{ both: 'driver' }, { both: 'deck' }],
    back: [{ both: 'deck' }]
  },
  15: {
    front: [{ abc: 'wc', de: 'wc' }, { abc: 'wash', de: 'wc' }, { abc: 'wash', de: 'phone' }, { both: 'deck' }],
    back: [{ both: 'deck' }]
  },
  14: {
    front: [{ both: 'deck' }],
    back: [{ both: 'deck' }]
  },
  13: {
    front: [{ abc: 'wc', de: 'wc' }, { abc: 'wash', de: 'wc' }, { both: 'deck' }],
    back: [{ both: 'deck' }]
  }
};
import { useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useMemo } from 'react';
import { studentApi, teacherApi } from '../helpers/domainApi';
import type { StudentDTO, TeacherDTO } from '../helpers/domainApi';
import { pad2 } from '../helpers/pad2';
import MDButton from '../components/MDButton';
const CAR_NUMBERS = [13, 14, 15, 16];
const CAR_ROWS: Record<number, number> = {
  16: 15,
  15: 16,
  14: 20,
  13: 18
};

const BASE_SEATS = ['A', 'B', 'C', '', 'D', 'E']; // 3+通路+2配列

const ShinkansenFloor = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const direction = params.get('direction');
  const isTopHiroshima = direction === 'hiroshima';
  const navigate = useNavigate();

  // 進行方向切り替え
  const handleToggleDirection = () => {
    const newDirection = isTopHiroshima ? undefined : 'hiroshima';
    const newParams = new URLSearchParams(location.search);
    if (newDirection) {
      newParams.set('direction', newDirection);
    } else {
      newParams.delete('direction');
    }
    navigate({ search: newParams.toString() ? `?${newParams.toString()}` : '' });
  };
  // direction=hiroshima のみ広島方面（13号車が上）、それ以外（未指定や空文字含む）は東京方面（16号車が上）
  const cars = isTopHiroshima ? CAR_NUMBERS : [...CAR_NUMBERS].reverse();

  // 生徒・先生データ取得
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  useEffect(() => {
    let mounted = true;
    studentApi.list({ alwaysFetch: false }).then((data) => {
      if (mounted && Array.isArray(data)) setStudents(data);
    });
    teacherApi.list().then((data) => {
      if (mounted && Array.isArray(data)) setTeachers(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 座席マッピング（car, row, seat で高速検索）
  const seatMap = useMemo(() => {
    const map = new Map<string, { type: 'student' | 'teacher' | 'staff'; data: StudentDTO | TeacherDTO | { name: string } }>();
    for (const s of students) {
      const carNum = isTopHiroshima ? s.shinkansen_day4_car_number : s.shinkansen_day1_car_number;
      const seat = isTopHiroshima ? s.shinkansen_day4_seat : s.shinkansen_day1_seat;
      if (carNum && seat) {
        map.set(`${carNum}-${seat}`, { type: 'student', data: s });
      }
    }
    for (const t of teachers) {
      const carNum = isTopHiroshima ? t.shinkansen_day4_car_number : t.shinkansen_day1_car_number;
      const seat = isTopHiroshima ? t.shinkansen_day4_seat : t.shinkansen_day1_seat;
      if (carNum && seat) {
        map.set(`${carNum}-${seat}`, { type: 'teacher', data: t });
      }
    }
    // STAFF_SEATを追加（directionで切り替え）
    for (const staff of STAFF_SEAT) {
      const staffSeat = isTopHiroshima ? staff.day4 : staff.day1;
      const carNum = staffSeat.car;
      const seat = staffSeat.seat;
      if (carNum && seat) {
        const key = `${carNum}-${seat}`;
        if (!map.has(key)) {
          map.set(key, { type: 'staff', data: { name: staff.name } });
        }
      }
    }
    return map;
  }, [students, teachers, isTopHiroshima]);

  const setGoodName = (student: StudentDTO) => {
    const name = student.surname;
    return name.length > 4 ? student.surname_kana : name;
  };

  const getRandomFace = () => {
    const FACES = ['(･。･)?', '(･へ･)', '(-_-)zzz', 'Σ(-｡-)', '(^o^)', '(LOL)', 'θwθ', '(T_T)', '(*_*)', '・ω・', '(*´∀｀)'];

    const random = Math.round(Math.random() * (FACES.length - 1));
    return FACES[random];
  };

  const SwitchButton = () => {
    return (
      <div className="w-full flex flex-col items-center my-2 select-none bg-white">
        <button
          type="button"
          onClick={handleToggleDirection}
          className="flex flex-row items-center justify-center w-full py-2 border border-blue-300 rounded-lg shadow-sm bg-blue-50 hover:bg-blue-100 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition group"
          aria-label="進行方向を切り替え">
          <span className="text-3xl text-blue-600 group-hover:text-blue-800 group-active:text-blue-900 transition ml-2">↑</span>
          <div className="flex flex-col items-center mr-auto">
            <span className="text-sm text-blue-600">進行方向</span>
            <span className="text-sm text-blue-600">{isTopHiroshima ? '広島方面' : '東京方面'}</span>
          </div>
          <div className="flex flex-col items-center mx-auto">
            <span className="text-xl text-blue-600">{isTopHiroshima ? '4日目' : '1日目'}</span>
          </div>
          <div className="flex flex-col items-center justify-center mx-2">
            <span className="text-sm text-blue-600">クリックして</span>
            <span className="text-sm text-blue-600">日付を切り替え</span>
          </div>
        </button>
      </div>
    );
  };

  const Header = ({ seats }: { seats: string[] }) => {
    return (
      <div className="flex flex-row">
        {seats.map((seat, seatIdx) =>
          seat === '' ? (
            <div key={'aisle-header-' + seatIdx} className="w-6" />
          ) : (
            <div key={'header-' + seat} className="flex items-center justify-center w-16 text-base font-bold text-center text-gray-500 py-1 m-0.5">
              {seat}
            </div>
          )
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center w-full my-1">
      <MDButton text="戻る" arrowLeft color="white" link="/shinkansen" />
      <h2 className="text-xl font-bold mb-2">{'N700系 座席表 '}</h2>
      <div className="flex flex-col gap-2 items-start">
        {/* 座席表本体 */}
        <div className="flex flex-col gap-2">
          {cars.map((car) => {
            const rowCount = CAR_ROWS[car] || 12;
            const ROWS = isTopHiroshima ? Array.from({ length: rowCount }, (_, i) => i + 1) : Array.from({ length: rowCount }, (_, i) => rowCount - i);
            // 進行方向で座席配列を切り替え
            const SEATS = isTopHiroshima ? BASE_SEATS : [...BASE_SEATS].reverse();
            // 設備情報取得
            const facilities = CAR_FACILITIES[car];
            // 上下の並びも進行方向で切り替え
            const topFacilities = isTopHiroshima ? facilities.back : facilities.front;
            const bottomFacilities = isTopHiroshima ? facilities.front : facilities.back;
            // 上下の設備行をreverseで入れ替え
            const topFacilitiesArr = topFacilities ? [...topFacilities] : [];
            const bottomFacilitiesArr = bottomFacilities ? [...bottomFacilities] : [];
            if (isTopHiroshima) {
              topFacilitiesArr.reverse();
              bottomFacilitiesArr.reverse();
            }
            return (
              <>
                <SwitchButton />
                <div key={car} className="bg-white rounded-lg shadow p-2 flex flex-col items-center">
                  <div className="flex flex-row items-center justify-center font-semibold text-lg my-2">
                    <p className="mx-1">{car}号車</p>
                    <img className="mx-1" src="https://railway.jr-central.co.jp/train/_common/_img/uni_bod_ico_07_02.gif" alt="禁煙" />
                  </div>
                  {/* 上部設備（reverse対応） */}
                  {topFacilitiesArr.map((fg, idx) => (
                    <FacilityRow key={'top-' + idx} facilities={fg} isTopHiroshima={isTopHiroshima} />
                  ))}
                  {/* 横方向で1行ずつdivでラップ */}
                  <div className="flex flex-col">
                    {/* ヘッダー行 */}
                    <Header seats={SEATS} />
                    {/* 各行 */}
                    {ROWS.map((row) => (
                      <div key={'row-' + row} className="flex flex-row">
                        {SEATS.map((seat, seatIdx) => {
                          if (seat === '') {
                            // 通路（CとDの間）に行番号を表示
                            return (
                              <div key={row + 'aisle' + seatIdx} className="w-6 flex items-center justify-center">
                                <span className="text-xs text-gray-500 font-bold select-none">{row}</span>
                              </div>
                            );
                          }
                          const seatKey = `${car}-${row}${seat}`;
                          const seatData = seatMap.get(seatKey);
                          return (
                            <div
                              key={row + seat}
                              className={`w-16 h-12 flex flex-col items-center justify-center border-2 rounded text-base cursor-pointer font-semibold m-0.5
                              ${seatData ? (seatData.type === 'teacher' ? 'bg-yellow-100 text-yellow-900 border-yellow-400' : seatData.type === 'staff' ? 'bg-purple-100 text-purple-900 border-purple-400' : 'bg-green-100 text-gray-700 border-green-300') : 'bg-blue-50 text-gray-700 hover:bg-blue-200'}`}
                              title={`${car}号車${row}${seat}`}>
                              {seatData ? (
                                seatData.type === 'teacher' ? (
                                  <>
                                    <span className="text-xs font-bold text-yellow-700 leading-none">先生</span>
                                    <span>{(seatData.data as TeacherDTO).surname}</span>
                                  </>
                                ) : seatData.type === 'staff' ? (
                                  <>
                                    <span className="text-xs font-bold text-purple-700 leading-none">STAFF</span>
                                    <span>{(seatData.data as { name: string }).name}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs leading-none">
                                      5{(seatData.data as StudentDTO).class}
                                      {pad2((seatData.data as StudentDTO).number)}
                                    </span>
                                    <span>{setGoodName(seatData.data as StudentDTO)}</span>
                                  </>
                                )
                              ) : (
                                <p className="text-sm">{getRandomFace()}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <Header seats={SEATS} />
                  </div>
                  {/* 下部設備（reverse対応） */}
                  {bottomFacilitiesArr.map((fg, idx) => (
                    <FacilityRow key={'bottom-' + idx} facilities={fg} isTopHiroshima={isTopHiroshima} />
                  ))}
                  <div className="flex flex-row items-center justify-center font-semibold text-lg my-2">
                    <p className="mx-1">{car}号車</p>
                    <img className="mx-1" src="https://railway.jr-central.co.jp/train/_common/_img/uni_bod_ico_07_02.gif" alt="禁煙" />
                  </div>
                  <MDButton text="戻る" arrowLeft color="white" link="/shinkansen" />
                </div>
              </>
            );
          })}
        </div>
        <SwitchButton />
      </div>
      <MDButton text="戻る" arrowLeft color="white" link="/shinkansen" />
    </div>
  );
};

export default ShinkansenFloor;
