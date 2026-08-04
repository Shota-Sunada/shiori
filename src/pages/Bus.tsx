import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { studentApi, teacherApi, type StudentDTO, type TeacherDTO } from '../helpers/domainApi';
import { pad2 } from '../helpers/pad2';
import { useAuth } from '../auth-context';
import { BackToHome } from '../components/MDButton';

const Bus: React.FC = () => {
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([studentApi.list(), teacherApi.list()])
      .then(([studentData, teacherData]) => {
        setStudents(studentData);
        setTeachers(teacherData);
        setLoading(false);
      })
      .catch(() => {
        setError('生徒・先生データの取得に失敗しました');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-4 text-center">読込中...</div>;
  if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;

  const params = new URLSearchParams(location.search);
  const busType = params.get('bus') || 'day1';

  let groupKey: 'day1bus' | 'day3bus' | 'class' = 'day1bus';
  let groupLabel = '1日目バス';
  let suffix = '号車';
  if (busType === 'day3') {
    groupKey = 'day3bus';
    groupLabel = '3日目バス';
  } else if (busType === 'day4') {
    groupKey = 'class';
    groupLabel = '4日目（クラス）';
    suffix = '組';
  }

  // 生徒と先生を同じバス/クラスでまとめる
  type Person = (StudentDTO & { isTeacher?: false }) | (TeacherDTO & { isTeacher: true });
  const people: Person[] = [...students.map((s) => ({ ...s, isTeacher: false as const })), ...teachers.map((t) => ({ ...t, isTeacher: true as const }))];

  const busMap: Record<string, Person[]> = {};
  people.forEach((person) => {
    let key: string;
    if (groupKey === 'class') {
      key = person.isTeacher ? String(person.day4class) : String((person as StudentDTO).class);
    } else if (groupKey === 'day1bus') {
      key = person.isTeacher ? String(person.day1bus) : (person as StudentDTO).day1bus || '未設定';
    } else if (groupKey === 'day3bus') {
      key = person.isTeacher ? String(person.day3bus) : (person as StudentDTO).day3bus || '未設定';
    } else {
      key = '未設定';
    }
    if (!busMap[key]) busMap[key] = [];
    busMap[key].push(person);
  });

  const switchOptions =
    busType === 'day1'
      ? [
          { type: 'day3', label: '3日目バス', search: '?bus=day3' },
          { type: 'day4', label: '4日目バス', search: '?bus=day4' }
        ]
      : busType === 'day3'
        ? [
            { type: 'day1', label: '1日目バス', search: '' },
            { type: 'day4', label: '4日目バス', search: '?bus=day4' }
          ]
        : [
            { type: 'day1', label: '1日目バス', search: '' },
            { type: 'day3', label: '3日目バス', search: '?bus=day3' }
          ];

  const entries = Object.entries(busMap).sort(([a], [b]) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b, 'ja');
  });

  return (
    <div className="flex flex-col gap-4 items-center p-2">
      <h1 className="text-2xl font-bold text-blue-800 mb-2 mt-2 select-none">
        {busType === 'day1' && '1日目バス (企業訪問)'}
        {busType === 'day3' && '3日目バス (コース別研修)'}
        {busType === 'day4' && '4日目バス (クラス)'}
      </h1>
      <div className="w-full flex justify-center mb-2">
        <div className="flex w-full max-w-[340px] gap-2 py-1">
          {switchOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => navigate({ search: option.search })}
              className="flex-1 flex flex-col items-center justify-center px-2 py-1 border border-blue-300 rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-700">
              <span className="text-sm font-semibold leading-tight">{option.label}</span>
              <span className="text-[10px] text-blue-500 leading-tight mt-0.5">へ切替</span>
            </button>
          ))}
        </div>
      </div>
      {entries.filter(([busName]) => {
        // 0号車（バス名が'0'）は非表示（4日目クラス分けも含む）
        return busName !== '0';
      }).length === 0 ? (
        <div className="text-gray-500">表示できる生徒データがありません</div>
      ) : (
        entries
          .filter(([busName]) => {
            return busName !== '0';
          })
          .map(([busName, busPeople]) => {
            // 生徒→先生の順で、class/number順で並べる
            const sortedPeople = [...busPeople].sort((a, b) => {
              if (a.isTeacher && !b.isTeacher) return 1;
              if (!a.isTeacher && b.isTeacher) return -1;
              // 生徒同士
              if (!a.isTeacher && !b.isTeacher) {
                if ((a as StudentDTO).class !== (b as StudentDTO).class) return (a as StudentDTO).class - (b as StudentDTO).class;
                return (a as StudentDTO).number - (b as StudentDTO).number;
              }
              // 先生同士
              if (a.isTeacher && b.isTeacher) {
                return a.surname.localeCompare(b.surname, 'ja');
              }
              return 0;
            });

            const rowSize = 4;
            const minRows = 4;
            const totalCells = Math.max(rowSize * Math.ceil(sortedPeople.length / rowSize), rowSize * minRows);
            const rows: (Person | null)[][] = [];
            for (let i = 0; i < totalCells; i += rowSize) {
              rows.push(Array.from({ length: rowSize }, (_, j) => sortedPeople[i + j] || null));
            }

            // ログインユーザーのgakuseki番号をlocalStorageから取得
            const myGakuseki = (() => {
              try {
                const v = localStorage.getItem('gakuseki');
                return v ? Number(v) : null;
              } catch {
                return null;
              }
            })();

            const getCompactName = (person: Person) => {
              if (person.isTeacher) {
                return person.surname;
              } else {
                const base = (person as StudentDTO).surname;
                return base.length > 4 ? (person as StudentDTO).surname_kana : base;
              }
            };

            return (
              <React.Fragment key={busName}>
                <div className="w-full max-w-[340px] bg-white rounded-lg shadow p-2 flex flex-col items-center border-2 border-blue-300">
                  <div className="text-lg font-bold text-blue-900 mb-2 select-none">
                    {groupLabel} {busName}
                    {suffix}
                  </div>
                  <div className="flex flex-col gap-1 w-full px-1 py-1 select-none">
                    {rows.map((row, rowIdx) => (
                      <div key={rowIdx} className="flex flex-row gap-0.5 w-full justify-center items-center">
                        {row.map((person, seatIdx) => {
                          const baseClass = 'w-16 h-12 flex flex-col items-center justify-center border-2 rounded cursor-default font-semibold m-0.5';
                          let occupied = 'bg-gray-100 border-gray-300 text-gray-300';
                          let isMe = false;
                          if (person) {
                            if (!person.isTeacher && myGakuseki && (person as StudentDTO).gakuseki === myGakuseki) {
                              occupied = 'bg-red-200 text-red-800 border-red-500';
                              isMe = true;
                            } else if (person.isTeacher) {
                              occupied = 'bg-yellow-100 text-yellow-800 border-yellow-400';
                            } else {
                              occupied = 'bg-green-100 text-gray-700 border-green-300';
                            }
                          }
                          return (
                            <div
                              key={person ? (person.isTeacher ? `t-${person.id}` : `${(person as StudentDTO).class}-${(person as StudentDTO).number}`) : `empty-${rowIdx}-${seatIdx}`}
                              className={`${baseClass} ${occupied} ${isMe ? 'ring-2 ring-red-500' : ''}`}
                              title={
                                person
                                  ? person.isTeacher
                                    ? `${person.surname} ${person.forename}（先生）`
                                    : `5${(person as StudentDTO).class}${pad2((person as StudentDTO).number)} ${(person as StudentDTO).surname} ${(person as StudentDTO).forename}`
                                  : '空席'
                              }>
                              {person ? (
                                person.isTeacher ? (
                                  <>
                                    <span className="text-xs leading-none">先生</span>
                                    <span className="text-base leading-none mt-0.5 truncate max-w-[3.6rem]">{getCompactName(person)}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-xs leading-none">
                                      5{(person as StudentDTO).class}
                                      {pad2((person as StudentDTO).number)}
                                    </span>
                                    <span className="text-base leading-none mt-0.5 truncate max-w-[3.6rem]">{getCompactName(person)}</span>
                                  </>
                                )
                              ) : (
                                <span className="text-xs">空席</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="w-full flex flex-col items-center gap-2 my-2">
                  <div className="w-full flex justify-center mb-2">
                    <div className="flex w-full max-w-[340px] gap-2 py-1">
                      {switchOptions.map((option) => (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => navigate({ search: option.search })}
                          className="flex-1 flex flex-col items-center justify-center px-2 py-1 border border-blue-300 rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-700">
                          <span className="text-sm font-semibold leading-tight">{option.label}</span>
                          <span className="text-[10px] text-blue-500 leading-tight mt-0.5">へ切替</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <BackToHome user={user} />
                </div>
              </React.Fragment>
            );
          })
      )}
      <div className="w-full flex justify-center mt-4">
        <div className="flex w-full max-w-[340px] gap-2 py-1">
          {switchOptions.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => navigate({ search: option.search })}
              className="flex-1 flex flex-col items-center justify-center px-2 py-1 border border-blue-300 rounded-md shadow-sm bg-blue-50 hover:bg-blue-100 active:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 transition text-blue-700">
              <span className="text-sm font-semibold leading-tight">{option.label}</span>
              <span className="text-[10px] text-blue-500 leading-tight mt-0.5">へ切替</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Bus;
