// 配列で設定できるように変更
// 例: [{ hotel: 'tdh', floor: 9, room: 17, label: '特別室' }, { hotel: 'fpr', floor: 3, room: 5, label: 'VIP' }]
const roomLabelsList: { hotel: string; floor: number; room: number; label: string }[] = [
  { hotel: 'tdh', floor: 9, room: 10, label: '😡' },
  { hotel: 'fpr', floor: 3, room: 3, label: '改装工事中' },
  { hotel: 'fpr', floor: 5, room: 3, label: '改装工事中' },
  { hotel: 'fpr', floor: 5, room: 4, label: '改装工事中' },
];

// 内部でマップに変換
const roomLabels: Record<string, Record<string, Record<string, string>>> = {};
roomLabelsList.forEach(({ hotel, floor, room, label }) => {
  if (!roomLabels[hotel]) roomLabels[hotel] = {};
  if (!roomLabels[hotel][String(floor)]) roomLabels[hotel][String(floor)] = {};
  roomLabels[hotel][String(floor)][String(room)] = label;
});
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth-context';
import LoadingPage from '../components/LoadingPage';
import { studentApi, teacherApi } from '../helpers/domainApi';
import type { StudentDTO, TeacherDTO } from '../helpers/domainApi';
import { pad2 } from '../helpers/pad2';
import { getRandomFace } from '../helpers/randomFaces';

const TDH_FLOORS = [9, 10, 11, 13, 16] as const;
const FPR_FLOORS = [2, 3, 4, 5, 6] as const;
const TDH_ROOM_SEQUENCE_BASE = [31, 29, 27, 25, 23, 21, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6] as const;
const TDH_ROOM_SEQUENCE = [...TDH_ROOM_SEQUENCE_BASE].sort((a, b) => a - b);
const FPR_ROOM_SEQUENCE_MAP: Record<number, number[]> = {
  2: Array.from({ length: 19 }, (_, i) => i + 1),
  3: Array.from({ length: 19 }, (_, i) => i + 1),
  4: Array.from({ length: 19 }, (_, i) => i + 1),
  5: Array.from({ length: 13 }, (_, i) => i + 1),
  6: Array.from({ length: 13 }, (_, i) => i + 1)
};

const formatRoomId = (hotel: string, floor: number, number: number) => {
  if (hotel === 'fpr') {
    // FPRは3(階数)(番号)形式
    return `3${floor}${pad2(number)}`;
  }
  // TDHは従来通り
  return `${pad2(floor)}${pad2(number)}`;
};
const normalizeRoomId = (value: number | string | null | undefined): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const raw = typeof value === 'number' ? value.toString() : `${value}`.trim();
  if (!raw) return undefined;
  return raw.padStart(4, '0');
};

const HOTEL_TYPES = [
  { key: 'tdh', label: '東京ドームホテル', roomKey: 'room_tdh' },
  { key: 'fpr', label: 'フジプレミアムリゾート', roomKey: 'room_fpr' }
];

const Hotel = () => {
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHotel, setSelectedHotel] = useState(HOTEL_TYPES[0].key);
  const [selectedFloor, setSelectedFloor] = useState<number | undefined>(TDH_FLOORS[0]);
  const { user } = useAuth();

  const STAFF_ROOMS = useMemo(
    () => [
      // TDH用スタッフ
      { name: 'カメラマン', floor: 9, room: 3, hotel: 'tdh' },
      { name: '添乗員', floor: 9, room: 17, hotel: 'tdh' },
      { name: '看護師', floor: 10, room: 34, hotel: 'tdh' },
      { name: '添乗員', floor: 10, room: 36, hotel: 'tdh' },
      { name: '添乗員', floor: 11, room: 34, hotel: 'tdh' },
      { name: '添乗員', floor: 16, room: 36, hotel: 'tdh' },
      // FPR用スタッフ（例: 空、または今後追加）
      { name: '保健室', floor: 2, room: 14, hotel: 'fpr' },
      { name: '保健室', floor: 2, room: 15, hotel: 'fpr' },
      { name: '保健室', floor: 3, room: 15, hotel: 'fpr' },
      { name: '保健室', floor: 4, room: 14, hotel: 'fpr' },
      { name: '保健室', floor: 4, room: 15, hotel: 'fpr' },
    ],
    []
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [studentData, teacherData] = await Promise.all([studentApi.list(), teacherApi.list()]);
        if (!active) return;
        setStudents(Array.isArray(studentData) ? studentData : []);
        setTeachers(Array.isArray(teacherData) ? teacherData : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const roomAssignments = useMemo(() => {
    const map = new Map<string, { students: StudentDTO[]; teachers: TeacherDTO[]; staff: { name: string }[] }>();
    const roomKey = selectedHotel === 'tdh' ? 'room_tdh' : 'room_fpr';
    students.forEach((student) => {
      const roomId = normalizeRoomId(student[roomKey]);
      if (!roomId) return;
      if (!map.has(roomId)) {
        map.set(roomId, { students: [], teachers: [], staff: [] });
      }
      map.get(roomId)!.students.push(student);
    });
    teachers.forEach((teacher) => {
      const roomId = normalizeRoomId(teacher[roomKey]);
      if (!roomId) return;
      if (!map.has(roomId)) {
        map.set(roomId, { students: [], teachers: [], staff: [] });
      }
      map.get(roomId)!.teachers.push(teacher);
    });
    // スタッフはホテルごとに表示
    STAFF_ROOMS.filter((staff) => staff.hotel === selectedHotel).forEach((staff) => {
      const roomId = normalizeRoomId(formatRoomId(selectedHotel, staff.floor, staff.room));
      if (!roomId) return;
      if (!map.has(roomId)) {
        map.set(roomId, { students: [], teachers: [], staff: [] });
      }
      map.get(roomId)!.staff.push({ name: staff.name });
    });
    return map;
  }, [students, teachers, STAFF_ROOMS, selectedHotel]);

  if (loading) {
    return <LoadingPage message="ホテルの部屋割を読込中..." />;
  }

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <h1 className="text-2xl font-bold">ホテル部屋割一覧</h1>
      <div className="w-full max-w-5xl flex flex-col md:flex-row gap-2 md:items-end">
        <label className="flex flex-col gap-1 text-sm text-gray-600 w-full md:w-1/2">
          ホテルを選択
          <select
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={selectedHotel}
            onChange={(e) => {
              const nextHotel = e.target.value as (typeof HOTEL_TYPES)[number]['key'];
              setSelectedHotel(nextHotel);
              setSelectedFloor(nextHotel === 'fpr' ? FPR_FLOORS[0] : TDH_FLOORS[0]);
            }}>
            {HOTEL_TYPES.map((hotel) => (
              <option key={hotel.key} value={hotel.key}>
                {hotel.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-gray-600 w-full md:w-1/2">
          表示する階を選択
          <select
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-base shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={selectedFloor ?? ''}
            onChange={(event) => {
              const val = event.target.value;
              setSelectedFloor(val ? Number(val) : undefined);
            }}>
            <option value="" disabled>
              階数を選択してください
            </option>
            {(selectedHotel === 'fpr' ? FPR_FLOORS : TDH_FLOORS).map((floor) => (
              <option key={floor} value={floor}>
                {floor}階
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="w-full max-w-5xl rounded-lg bg-white/80 p-4 shadow">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#50141c]">{selectedFloor ? `${selectedFloor}階` : '階未選択'}</h2>
          <span className="text-sm text-gray-500">部屋数: {selectedHotel === 'fpr' && selectedFloor ? (FPR_ROOM_SEQUENCE_MAP[selectedFloor]?.length ?? 0) : TDH_ROOM_SEQUENCE.length}</span>
        </header>
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-8">
          {selectedFloor &&
            (selectedHotel === 'fpr' ? (FPR_ROOM_SEQUENCE_MAP[selectedFloor] ?? []) : TDH_ROOM_SEQUENCE).map((roomNumber) => {
              const roomId = formatRoomId(selectedHotel, selectedFloor, roomNumber);
              const assign = roomAssignments.get(roomId) ?? { students: [], teachers: [], staff: [] };
              const sortedStudents = assign.students.slice().sort((a, b) => a.gakuseki - b.gakuseki);
              const sortedTeachers = assign.teachers.slice().sort((a, b) => a.surname.localeCompare(b.surname, 'ja'));
              const sortedStaff = assign.staff;
              const total = sortedStudents.length + sortedTeachers.length + sortedStaff.length;
              // ラベル表示判定
              let customLabel: string | undefined = undefined;
              if (roomLabels[selectedHotel]?.[String(selectedFloor)]?.[String(roomNumber)]) {
                customLabel = roomLabels[selectedHotel][String(selectedFloor)][String(roomNumber)];
              }
              return (
                <div key={roomId} className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-700">{roomId}</span>
                    <span className="text-[10px] text-gray-400">{total ? `${total}名` : '空室'}</span>
                  </div>
                  {customLabel && <div className="w-full text-center text-2xl font-bold text-pink-600 bg-pink-50 rounded mb-1 py-1">{customLabel}</div>}
                  <div className="flex flex-col gap-1">
                    {total === 0 ? (
                      customLabel ? null : (
                        <div className="rounded text-center text-xs text-gray-400">
                          {(() => {
                            // ホテルごとに人数を決定
                            const min = selectedHotel === 'fpr' ? 1 : 1;
                            const max = selectedHotel === 'fpr' ? 5 : 3;
                            const count = Math.floor(Math.random() * (max - min + 1)) + min;
                            return (
                              <>
                                <div className="flex flex-col gap-1">
                                  {Array.from({ length: count }).map((_, i) => (
                                    <div key={i} className="flex flex-col items-center justify-center rounded border border-gray-400 bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                                      <span className="text-[10px]">一般の方</span>
                                      <span>{getRandomFace()}</span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )
                    ) : (
                      <>
                        {sortedStudents.map((student) => {
                          const userIdNum = user ? Number(user.userId) : undefined;
                          const isCurrent = user && student.gakuseki === userIdNum;
                          return (
                            <div
                              key={student.gakuseki}
                              className={
                                isCurrent
                                  ? 'flex flex-col items-center justify-center rounded border border-red-400 bg-red-100 px-2 py-1 text-xs font-semibold text-red-900'
                                  : 'flex flex-col items-center justify-center rounded border border-green-300 bg-green-100 px-2 py-1 text-xs font-semibold text-green-900'
                              }>
                              <span className="text-[10px]">
                                5{student.class}
                                {pad2(student.number)}
                              </span>
                              <span className="flex flex-row space-x-1">
                                <p>{student.surname.length > 4 ? student.surname_kana : student.surname}</p>
                                <p>{student.forename.length > 4 ? student.forename_kana : student.forename}</p>
                              </span>
                            </div>
                          );
                        })}
                        {sortedTeachers.map((teacher) => {
                          const userIdNum = user ? Number(user.userId) : undefined;
                          const isCurrent = user && teacher.id === userIdNum;
                          return (
                            <div
                              key={teacher.id}
                              className={
                                isCurrent
                                  ? 'flex flex-col items-center justify-center rounded border border-red-400 bg-red-100 px-2 py-1 text-xs font-semibold text-red-900'
                                  : 'flex flex-col items-center justify-center rounded border border-blue-300 bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-900'
                              }>
                              <span className="text-[10px]">先生</span>
                              <span className="flex flex-row space-x-1">
                                <p>{teacher.surname}</p>
                                <p>{teacher.forename}</p>
                              </span>
                            </div>
                          );
                        })}
                        {sortedStaff.map((staff, idx) => (
                          <div
                            key={staff.name + idx}
                            className="flex flex-col items-center justify-center rounded border border-purple-300 bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-900">
                            <span className="text-[10px]">STAFF</span>
                            <span>{staff.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </section>
    </div>
  );
};

export default Hotel;

// 部屋の並び
// 各階同じ、部屋番号は「pad2(階数)番号」である (例: 9階24 => 0924)
// 階段 階段 31 29 27 25 23 21 19 17 15 13 11 09 07 05 03 01
// 36 34 32 30 28 26 24 22 20 18 16 14 12 10 08 06 階段 階段
