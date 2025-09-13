import { useLocation, useNavigate } from 'react-router-dom';
import React, { useEffect, useState, useMemo } from 'react';
import { studentApi, teacherApi } from '../helpers/domainApi';
import type { StudentDTO, TeacherDTO } from '../helpers/domainApi';
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
    const map = new Map<string, { type: 'student' | 'teacher'; data: StudentDTO | TeacherDTO }>();
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
    return map;
  }, [students, teachers, isTopHiroshima]);

  return (
    <div className="flex flex-col items-center w-full my-1">
      <h2 className="text-xl font-bold mb-2">
        {'N700系 座席表 '}
        {isTopHiroshima ? '(4日目)' : '(1日目)'}
      </h2>
      <div className="flex flex-col gap-2 items-start">
        <div className="w-full flex flex-col items-center mb-2 select-none bg-white">
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
            <div className="flex flex-col items-center justify-center mr-2">
              <span className="text-sm text-blue-600">クリックして</span>
              <span className="text-sm text-blue-600">切り替え</span>
            </div>
          </button>
        </div>
        {/* 座席表本体 */}
        <div className="flex flex-col gap-8">
          {cars.map((car) => {
            const rowCount = CAR_ROWS[car] || 12;
            const ROWS = isTopHiroshima ? Array.from({ length: rowCount }, (_, i) => i + 1) : Array.from({ length: rowCount }, (_, i) => rowCount - i);
            // 進行方向で座席配列を切り替え
            const SEATS = isTopHiroshima ? BASE_SEATS : [...BASE_SEATS].reverse();
            return (
              <div key={car} className="bg-white rounded-lg shadow p-2 flex flex-col items-center">
                <div className="font-semibold text-lg mb-4">{car}号車</div>
                <div className="grid gap-1" style={{ gridTemplateColumns: 'min-content repeat(6, auto)' }}>
                  {/* ヘッダー */}
                  <div className="" />
                  {SEATS.map((seat, idx) =>
                    seat === '' ? (
                      <div key={idx} className="" />
                    ) : (
                      <div key={seat} className="text-base font-bold text-center text-gray-500 pb-2">
                        {seat}
                      </div>
                    )
                  )}
                  {/* 座席 */}
                  {ROWS.map((row) => (
                    <React.Fragment key={row}>
                      {/* 行番号セル */}
                      <div className="w-6 h-12 flex items-center justify-center text-xs font-bold text-gray-500">{row}</div>
                      {SEATS.map((seat, idx) => {
                        if (seat === '') {
                          return <div key={row + 'aisle' + idx} className="w-4" />;
                        }
                        const seatKey = `${car}-${row}${seat}`;
                        const seatData = seatMap.get(seatKey);
                        return (
                          <div
                            key={row + seat}
                            className={`w-16 h-12 flex flex-col items-center justify-center border-2 rounded text-base cursor-pointer font-semibold
                              ${seatData ? (seatData.type === 'teacher' ? 'bg-yellow-100 text-yellow-900 border-yellow-400' : 'bg-green-100 text-gray-700 border-green-300') : 'bg-blue-50 text-gray-700 hover:bg-blue-200'}`}
                            title={`${car}号車${row}${seat}`}>
                            {seatData ? (
                              seatData.type === 'teacher' ? (
                                <>
                                  <span className="text-xs font-bold text-yellow-700 leading-none mb-0.5">先生</span>
                                  <span>{(seatData.data as TeacherDTO).surname}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xs leading-none">
                                    5{(seatData.data as StudentDTO).class}
                                    {(seatData.data as StudentDTO).number}
                                  </span>
                                  <span>{(seatData.data as StudentDTO).surname}</span>
                                </>
                              )
                            ) : (
                              ''
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShinkansenFloor;
