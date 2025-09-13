import { useEffect, useState } from 'react';
import { boatAssignmentsApi, studentApi, teacherApi } from '../helpers/domainApi';
import type { BoatAssignmentDTO, StudentDTO, TeacherDTO } from '../helpers/domainApi';
import MDButton from '../components/MDButton';
import { useAuth } from '../auth-context';
import { pad2 } from '../helpers/pad2';

const Boats = () => {
  const { user } = useAuth();
  const [boats, setBoats] = useState<BoatAssignmentDTO[]>([]);
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [boatsData, studentsData, teachersData] = await Promise.all([boatAssignmentsApi.list(), studentApi.list({ alwaysFetch: true }), teacherApi.list()]);
        setBoats(boatsData);
        setStudents(studentsData);
        setTeachers(teachersData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const getStudentName = (gakuseki: number) => {
    const s = students.find((st) => st.gakuseki === gakuseki);
    return s ? `5${s.class}${pad2(s.number)} ${s.surname} ${s.forename}` : `ID:${gakuseki}`;
  };
  const getTeacherName = (id: number) => {
    const t = teachers.find((tc) => tc.id === id);
    return t ? `${t.surname} ${t.forename}` : `ID:${id}`;
  };

  return (
    <div className="flex flex-col items-center justify-center m-2">
      <h1 className="text-2xl font-bold m-2">ラフティング ボート割 一覧</h1>
      <MDButton text="戻る" arrowLeft link={user?.is_teacher ? '/teacher' : '/'} />
      {loading ? (
        <div>データ読込中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {boats.length === 0 && <div className="col-span-2 text-gray-500">ボート割データがありません</div>}
          {boats
            .sort((a, b) => a.boat_index - b.boat_index)
            .map((boat) => (
              <div key={boat.id} className="border rounded-lg shadow p-4 bg-white flex flex-col h-full">
                <div className="flex items-center mb-2">
                  <h2 className="font-bold text-lg mr-2">{boat.boat_index + 1}挺</h2>
                  <span className="text-sm text-gray-500">
                    生徒: {boat.student_ids.length}人 / 先生: {boat.teacher_ids.length}人
                  </span>
                </div>
                <div className="mb-2">
                  <div className="font-semibold text-blue-700 mb-1">生徒</div>
                  <ul className="list-disc list-inside space-y-1">
                    {boat.student_ids.length === 0 && <li className="text-gray-400">割当なし</li>}
                    {boat.student_ids.map((gakuseki) => (
                      <li key={gakuseki}>{getStudentName(gakuseki)}</li>
                    ))}
                  </ul>
                </div>
                {boat.teacher_ids.length > 0 && (
                  <div>
                    <div className="font-semibold text-green-700 mb-1">先生</div>
                    <ul className="list-disc list-inside space-y-1">
                      {boat.teacher_ids.map((tid) => (
                        <li key={tid}>{getTeacherName(tid)} 先生</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
      <MDButton text="戻る" arrowLeft link={user?.is_teacher ? '/teacher' : '/'} />
    </div>
  );
};

export default Boats;
