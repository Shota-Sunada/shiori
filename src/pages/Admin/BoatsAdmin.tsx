import { useState, useEffect } from 'react';
import { studentApi, teacherApi, boatAssignmentsApi } from '../../helpers/domainApi';
import type { StudentDTO, TeacherDTO } from '../../helpers/domainApi';
import KanaSearchModal from '../../components/KanaSearchModal';
import StudentCardContent from '../../components/StudentCardContent';

const BOAT_CAPACITY = 7;

type BoatAssignment = {
  [boatIdx: number]: StudentDTO[];
};

const BoatsAdmin = () => {
  const [students, setStudents] = useState<StudentDTO[]>([]);
  const [boatAssignments, setBoatAssignments] = useState<BoatAssignment>({});
  const [teachers, setTeachers] = useState<TeacherDTO[]>([]);
  const [teacherAssignments, setTeacherAssignments] = useState<{ [boatIdx: number]: TeacherDTO[] }>({});
  // サーバー上のboat_assignmentsのIDをboat_indexごとに保持
  const [boatAssignmentIds, setBoatAssignmentIds] = useState<{ [boatIdx: number]: number }>({});
  const [selectedTeacher, setSelectedTeacher] = useState<{ [boatIdx: number]: string }>({}); // セレクトボックスの一時選択値
  const [kanaModalOpen, setKanaModalOpen] = useState(false);
  const [selectedBoat, setSelectedBoat] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // 既にどこかのボートに割り当て済みの先生ID
  const assignedTeacherIdSet = new Set<number>(
    Object.values(teacherAssignments)
      .flat()
      .map((t) => t.id)
  );
  // ボートに先生を追加
  const handleAddTeacherToBoat = async (boatIdx: number) => {
    const teacherIdStr = selectedTeacher[boatIdx];
    if (!teacherIdStr) return;
    const teacherId = Number(teacherIdStr);
    if (assignedTeacherIdSet.has(teacherId)) return;
    const teacher = teachers.find((t) => t.id === teacherId);
    if (!teacher) return;
    const currentStudents = boatAssignments[boatIdx]?.length || 0;
    const currentTeachers = teacherAssignments[boatIdx]?.length || 0;
    if (currentStudents + currentTeachers >= BOAT_CAPACITY) return;
    const nextTeachers = [...(teacherAssignments[boatIdx] || []), teacher];
    await saveBoatAssignment(boatIdx, boatAssignments[boatIdx] || [], nextTeachers);
    setTeacherAssignments((prev) => {
      const next = { ...prev };
      next[boatIdx] = nextTeachers;
      return next;
    });
    setSelectedTeacher((prev) => ({ ...prev, [boatIdx]: '' }));
  };

  // ボートから先生を外す
  const handleRemoveTeacher = async (boatIdx: number, teacherId: number) => {
    const nextTeachers = (teacherAssignments[boatIdx] || []).filter((t) => t.id !== teacherId);
    await saveBoatAssignment(boatIdx, boatAssignments[boatIdx] || [], nextTeachers);
    setTeacherAssignments((prev) => {
      const next = { ...prev };
      next[boatIdx] = nextTeachers;
      return next;
    });
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [studentsData, teachersData, boatAssignmentsData] = await Promise.all([studentApi.list({ alwaysFetch: true }), teacherApi.list(), boatAssignmentsApi.list()]);
        setStudents(studentsData);
        setTeachers(teachersData);
        // サーバーデータをローカル形式に変換
        const ba: BoatAssignment = {};
        const ta: { [boatIdx: number]: TeacherDTO[] } = {};
        const baIds: { [boatIdx: number]: number } = {};
        for (const row of boatAssignmentsData) {
          ba[row.boat_index] = row.student_ids.map((gakuseki) => studentsData.find((s) => s.gakuseki === gakuseki)).filter(Boolean) as StudentDTO[];
          ta[row.boat_index] = row.teacher_ids.map((tid) => teachersData.find((t) => t.id === tid)).filter(Boolean) as TeacherDTO[];
          baIds[row.boat_index] = row.id;
        }
        setBoatAssignments(ba);
        setTeacherAssignments(ta);
        setBoatAssignmentIds(baIds);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 既にどこかのボートに割り当て済みの生徒ID
  const assignedGakusekiSet = new Set<number>(
    Object.values(boatAssignments)
      .flat()
      .map((s) => s.gakuseki)
  );

  // ボートに生徒を追加
  const handleAddStudentToBoat = (boatIdx: number) => {
    setSelectedBoat(boatIdx);
    setKanaModalOpen(true);
  };

  // カタカナ検索で生徒選択時
  const handleStudentSelect = async (student: StudentDTO) => {
    if (selectedBoat == null) return;
    if (assignedGakusekiSet.has(student.gakuseki)) return;
    const currentStudents = boatAssignments[selectedBoat]?.length || 0;
    const currentTeachers = teacherAssignments[selectedBoat]?.length || 0;
    if (currentStudents + currentTeachers >= BOAT_CAPACITY) return;
    const nextStudents = [...(boatAssignments[selectedBoat] || []), student];
    await saveBoatAssignment(selectedBoat, nextStudents, teacherAssignments[selectedBoat] || []);
    setBoatAssignments((prev) => {
      const next = { ...prev };
      next[selectedBoat] = nextStudents;
      return next;
    });
    setKanaModalOpen(false);
    setSelectedBoat(null);
  };

  // ボートから生徒を外す
  const handleRemoveStudent = async (boatIdx: number, gakuseki: number) => {
    const nextStudents = (boatAssignments[boatIdx] || []).filter((s) => s.gakuseki !== gakuseki);
    await saveBoatAssignment(boatIdx, nextStudents, teacherAssignments[boatIdx] || []);
    setBoatAssignments((prev) => {
      const next = { ...prev };
      next[boatIdx] = nextStudents;
      return next;
    });
  };

  // ボート追加
  const handleAddBoat = async () => {
    const newIdx = Math.max(-1, ...Object.keys(boatAssignments).map(Number)) + 1;
    // サーバーに新規作成
    const res = await boatAssignmentsApi.create({ boat_index: newIdx, student_ids: [], teacher_ids: [] });
    setBoatAssignments((prev) => ({ ...prev, [newIdx]: [] }));
    setTeacherAssignments((prev) => ({ ...prev, [newIdx]: [] }));
    setBoatAssignmentIds((prev) => ({ ...prev, [newIdx]: (res as { id: number }).id }));
  };

  // ボート削除
  const handleRemoveBoat = async (boatIdx: number) => {
    const id = boatAssignmentIds[boatIdx];
    if (id) await boatAssignmentsApi.remove(id);
    setBoatAssignments((prev) => {
      const next = { ...prev };
      delete next[boatIdx];
      return next;
    });
    setTeacherAssignments((prev) => {
      const next = { ...prev };
      delete next[boatIdx];
      return next;
    });
    setBoatAssignmentIds((prev) => {
      const next = { ...prev };
      delete next[boatIdx];
      return next;
    });
  };
  // サーバーにboat_assignmentを保存（新規はcreate、既存はupdate）
  const saveBoatAssignment = async (boatIdx: number, students: StudentDTO[], teachers: TeacherDTO[]) => {
    const student_ids = students.map((s) => s.gakuseki);
    const teacher_ids = teachers.map((t) => t.id);
    const id = boatAssignmentIds[boatIdx];
    if (id) {
      await boatAssignmentsApi.update(id, { boat_index: boatIdx, student_ids, teacher_ids });
    } else {
      const res = await boatAssignmentsApi.create({ boat_index: boatIdx, student_ids, teacher_ids });
      setBoatAssignmentIds((prev) => ({ ...prev, [boatIdx]: (res as { id: number }).id }));
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ラフティング ボート割</h1>
      <div className="mb-4 flex gap-2">
        <button className="border border-green-600 text-green-700 rounded px-3 py-1 hover:bg-green-50" onClick={handleAddBoat}>
          ボートを追加
        </button>
      </div>
      {loading ? (
        <div>生徒データ読込中...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.keys(boatAssignments).map((key, idx) => {
            const i = Number(key);
            return (
              <div key={i} className="border rounded-lg shadow p-4 bg-white flex flex-col h-full">
                <div className="flex items-center mb-2">
                  <h2 className="font-bold text-lg mr-2">{`ボート${idx + 1}`}</h2>
                  <span className="text-sm text-gray-500">{`定員: ${boatAssignments[i].length} / ${BOAT_CAPACITY}`}</span>
                  <button
                    className="ml-2 text-red-500 hover:text-red-700 border border-red-300 rounded px-2 py-0.5 text-xs"
                    onClick={() => handleRemoveBoat(i)}
                    disabled={Object.keys(boatAssignments).length <= 1}
                    title="このボートを削除">
                    ボート削除
                  </button>
                </div>
                {/* 割当リストを上部に、追加UIを下部に固定 */}
                <div className="flex flex-col flex-grow min-h-[60px]">
                  {/* 生徒割当リスト */}
                  {boatAssignments[i].map((student) => (
                    <div key={student.gakuseki} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1 mb-1">
                      <StudentCardContent student={student} />
                      <button className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg" onClick={() => handleRemoveStudent(i, student.gakuseki)} title="この生徒を外す">
                        ×
                      </button>
                    </div>
                  ))}
                  {/* 先生割当リスト */}
                  <div className="flex flex-wrap gap-2 items-center mt-2">
                    {teacherAssignments[i]?.map((teacher) => (
                      <div key={teacher.id} className="flex items-center bg-blue-50 rounded px-2 py-1 text-blue-800">
                        <span>
                          {teacher.surname} {teacher.forename}
                        </span>
                        <button className="ml-1 text-red-500 hover:text-red-700 font-bold text-base" onClick={() => handleRemoveTeacher(i, teacher.id)} title="この先生を外す">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* 下部に追加UIを配置 */}
                  <div className="mt-auto flex flex-col gap-2 pt-4">
                    <button
                      className="border border-blue-500 text-blue-700 rounded px-3 py-1 hover:bg-blue-50 disabled:opacity-50"
                      onClick={() => handleAddStudentToBoat(i)}
                      disabled={(boatAssignments[i]?.length || 0) + (teacherAssignments[i]?.length || 0) >= BOAT_CAPACITY}>
                      生徒を追加
                    </button>
                    <div className="flex items-center gap-2">
                      <select className="border rounded px-2 py-1" value={selectedTeacher[i] || ''} onChange={(e) => setSelectedTeacher((prev) => ({ ...prev, [i]: e.target.value }))}>
                        <option value="">先生を選択</option>
                        {teachers
                          .filter((t) => !assignedTeacherIdSet.has(t.id))
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.surname} {t.forename}
                            </option>
                          ))}
                      </select>
                      <button
                        className="border border-blue-500 text-blue-700 rounded px-2 py-1 hover:bg-blue-50 disabled:opacity-50"
                        onClick={() => handleAddTeacherToBoat(i)}
                        disabled={!selectedTeacher[i] || (boatAssignments[i]?.length || 0) + (teacherAssignments[i]?.length || 0) >= BOAT_CAPACITY}>
                        先生追加
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <KanaSearchModal
        isOpen={kanaModalOpen}
        onClose={() => {
          setKanaModalOpen(false);
          setSelectedBoat(null);
        }}
        allStudents={students.filter((s) => !assignedGakusekiSet.has(s.gakuseki))}
        onStudentSelect={handleStudentSelect}
        closeOnSelect={true}
      />
    </div>
  );
};

export default BoatsAdmin;
