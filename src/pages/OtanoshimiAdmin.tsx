import { useState, useEffect, type ChangeEvent, type DragEvent, useCallback, type FC, useRef, memo } from 'react';
import { SERVER_ENDPOINT } from '../App';
import '../styles/admin-table.css';
import KanaSearchModal from '../components/KanaSearchModal';
import type { student } from '../data/students';
import type { OtanoshimiData } from '../data/otanoshimi';
import { useAuth } from '../auth-context';
import CenterMessage from '../components/CenterMessage';

interface StudentChipProps {
  studentId: number;
  studentMap: Map<number, string>;
  onDelete: (studentId: number) => void;
}
const StudentChip: FC<StudentChipProps> = memo(({ studentId, studentMap, onDelete }) => {
  const studentName = studentMap.get(studentId) || '不明な生徒';
  return (
    <div className="flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded-full" aria-label={`生徒: ${studentName}`}>
      <span>{studentName}</span>
      <button type="button" onClick={() => onDelete(studentId)} className="ml-2 text-blue-800 hover:text-blue-900 cursor-pointer" aria-label={`${studentName} を削除`} title="削除">
        &times;
      </button>
    </div>
  );
});

const OtanoshimiAdmin = () => {
  const { token } = useAuth();
  const [teams, setTeams] = useState<OtanoshimiData[]>([]);
  const [status, setStatus] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [studentMap, setStudentMap] = useState<Map<number, string>>(new Map());
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{ index: number; field: 'leader' | 'members' } | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const data: OtanoshimiData[] = await response.json();
      const teamsWithDefaults = data.map((team) => ({
        ...team,
        custom_performers: team.custom_performers || [],
        enmoku: team.enmoku || ''
      }));
      setTeams(teamsWithDefaults);
    } catch (error) {
      console.error('チームデータの取得に失敗:', error);
      setStatus('チームデータの取得中にエラーが発生しました。');
    }
  }, [token]);

  const fetchAllStudents = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const studentsData: student[] = await response.json();
      setAllStudents(studentsData);
      const newStudentMap = new Map<number, string>();
      for (const student of studentsData) {
        newStudentMap.set(student.gakuseki, `${student.surname} ${student.forename}`);
      }
      setStudentMap(newStudentMap);
    } catch (error) {
      console.error('生徒データの取得に失敗:', error);
      setStatus('生徒データの取得中にエラーが発生しました。');
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTeams(), fetchAllStudents()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token, fetchTeams, fetchAllStudents]);

  // drag image 初期化
  useEffect(() => {
    if (!dragImageRef.current) {
      const el = document.createElement('div');
      el.style.width = '1px';
      el.style.height = '1px';
      el.style.opacity = '0';
      document.body.appendChild(el);
      dragImageRef.current = el;
    }
    return () => {
      if (dragImageRef.current) {
        document.body.removeChild(dragImageRef.current);
        dragImageRef.current = null;
      }
    };
  }, []);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index: number, field: keyof OtanoshimiData) => {
      const newTeams = [...teams];
      const value = e.target.value;

      if (field === 'leader' || field === 'time' || field === 'appearance_order') {
        newTeams[index] = { ...newTeams[index], [field]: Number(value) };
      } else if (field === 'members') {
        newTeams[index] = { ...newTeams[index], [field]: value.split(',').map(Number) };
      } else if (field === 'custom_performers' || field === 'supervisor') {
        newTeams[index] = { ...newTeams[index], [field]: value.split(',') };
      } else {
        newTeams[index] = { ...newTeams[index], [field]: value };
      }
      setTeams(newTeams);
    },
    [teams]
  );

  const handleSave = useCallback(async () => {
    if (!token) return;
    setStatus('保存中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(teams)
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      setStatus('保存しました。');
      setEditingIndex(null);
      fetchTeams();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  }, [token, teams, fetchTeams]);

  const handleAddNewTeam = useCallback(() => {
    const newTeam: OtanoshimiData = {
      name: '新しいチーム',
      enmoku: '',
      leader: 0,
      members: [],
      time: 0,
      appearance_order: teams.length + 1,
      custom_performers: [],
      comment: '',
      supervisor: []
    };
    setTeams([...teams, newTeam]);
    setEditingIndex(teams.length);
  }, [teams]);

  const handleDeleteTeam = useCallback(
    (index: number) => {
      if (!window.confirm('本当にこのチームを削除しますか？')) return;
      const newTeams = teams.filter((_, i) => i !== index);
      const updatedTeams = newTeams.map((team, i) => ({
        ...team,
        appearance_order: i + 1
      }));
      setTeams(updatedTeams);
    },
    [teams]
  );

  const handleDeleteStudent = useCallback(
    (teamIndex: number, field: 'leader' | 'members', studentId: number) => {
      const newTeams = [...teams];
      if (field === 'leader') {
        newTeams[teamIndex] = { ...newTeams[teamIndex], leader: 0 };
      } else if (field === 'members') {
        const newMembers = newTeams[teamIndex].members.filter((id) => id !== studentId);
        newTeams[teamIndex] = { ...newTeams[teamIndex], members: newMembers };
      }
      setTeams(newTeams);
    },
    [teams]
  );

  const onDragStart = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    if (dragImageRef.current) e.dataTransfer.setDragImage(dragImageRef.current, 0, 0);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLTableRowElement>, toIndex: number) => {
      const fromIndex = Number(e.dataTransfer.getData('text/plain'));
      const newTeams = [...teams];
      const [removed] = newTeams.splice(fromIndex, 1);
      newTeams.splice(toIndex, 0, removed);

      const updatedTeams = newTeams.map((team, index) => ({
        ...team,
        appearance_order: index + 1
      }));

      setTeams(updatedTeams);
    },
    [teams]
  );

  const onDragOver = useCallback((e: DragEvent<HTMLTableSectionElement>) => {
    e.preventDefault();
  }, []);

  const handleStudentSelect = useCallback(
    (student: student) => {
      if (!modalTarget) return;

      const { index, field } = modalTarget;
      const newTeams = [...teams];

      if (field === 'leader') {
        newTeams[index] = { ...newTeams[index], leader: student.gakuseki };
      } else if (field === 'members') {
        const currentMembers = newTeams[index].members;
        if (!currentMembers.includes(student.gakuseki)) {
          const newMembers = [...currentMembers, student.gakuseki];
          newTeams[index] = { ...newTeams[index], members: newMembers };
        }
      }

      setTeams(newTeams);
      setIsModalOpen(false);
      setModalTarget(null);
    },
    [modalTarget, teams]
  );

  if (loading) return <CenterMessage>読込中...</CenterMessage>;
  if (!loading && teams.length === 0) {
    return (
      <CenterMessage>
        <p className="mb-4">チームデータがありません。</p>
        <button
          onClick={() => {
            setStatus('初期チーム作成中...');
            handleAddNewTeam();
          }}
          className="border-2 border-black p-2 rounded-xl cursor-pointer bg-white">
          チームを追加
        </button>
        {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
      </CenterMessage>
    );
  }

  return (
    <div className="p-[5px] flex flex-col">
      <div className="table-root overflow-y-auto flex flex-grow max-h-[80dvh] max-w-[90dvw] mx-auto rounded-xl">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="w-12">{'順番'}</th>
              <th className="w-48">{'チーム名'}</th>
              <th className="w-48">{'演目'}</th>
              <th className="w-48">{'リーダー'}</th>
              <th className="w-96">{'メンバー'}</th>
              <th className="w-28">{'カスタム出演者'}</th>
              <th className="w-48">{'コメント'}</th>
              <th className="w-28">{'監修'}</th>
              <th className="w-12">{'時間 (分)'}</th>
              <th className="w-20 sticky-col">{'操作'}</th>
            </tr>
          </thead>
          <tbody onDragOver={onDragOver}>
            {teams.map((team, index) => (
              <tr key={index} onDrop={(e) => onDrop(e, index)}>
                <td className="bg-white text-center">
                  <div draggable onDragStart={(e) => onDragStart(e, index)} className="drag-handle">
                    {team.appearance_order}
                  </div>
                </td>
                {editingIndex === index ? (
                  <>
                    <td className="bg-white">
                      <input type="text" value={team.name} onChange={(e) => handleInputChange(e, index, 'name')} className="w-full" />
                    </td>
                    <td className="bg-white">
                      <input type="text" value={team.enmoku} onChange={(e) => handleInputChange(e, index, 'enmoku')} className="w-full" />
                    </td>
                    <td className="bg-white">
                      <div className="flex items-center flex-wrap gap-2">
                        {team.leader ? (
                          <StudentChip studentId={team.leader} studentMap={studentMap} onDelete={() => handleDeleteStudent(index, 'leader', team.leader)} />
                        ) : (
                          <button
                            onClick={() => {
                              setIsModalOpen(true);
                              setModalTarget({ index, field: 'leader' });
                            }}
                            className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                            title="リーダーを追加">
                            {'+'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="bg-white">
                      <div className="flex items-center flex-wrap gap-2">
                        {team.members.map((memberId) => (
                          <StudentChip key={memberId} studentId={memberId} studentMap={studentMap} onDelete={() => handleDeleteStudent(index, 'members', memberId)} />
                        ))}
                        <button
                          onClick={() => {
                            setIsModalOpen(true);
                            setModalTarget({ index, field: 'members' });
                          }}
                          className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 cursor-pointer"
                          title="メンバーを追加">
                          {'+'}
                        </button>
                      </div>
                    </td>
                    <td className="bg-white">
                      <input type="text" value={(team.custom_performers || []).join(',')} onChange={(e) => handleInputChange(e, index, 'custom_performers')} className="w-full" />
                    </td>
                    <td className="bg-white">
                      <textarea value={team.comment || ''} onChange={(e) => handleInputChange(e, index, 'comment')} className="w-full" />
                    </td>
                    <td className="bg-white">
                      <input type="text" value={(team.supervisor || []).join(',')} onChange={(e) => handleInputChange(e, index, 'supervisor')} className="w-full" />
                    </td>
                    <td className="bg-white">
                      <input type="number" value={team.time} onChange={(e) => handleInputChange(e, index, 'time')} className="w-full" />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="bg-white">{team.name}</td>
                    <td className="bg-white">{team.enmoku}</td>
                    <td className="bg-white">{studentMap.get(team.leader) || '未設定'}</td>
                    <td className="bg-white">{team.members.map((id) => studentMap.get(id)).join(', ')}</td>
                    <td className="bg-white">{(team.custom_performers || []).join(', ')}</td>
                    <td className="bg-white">{team.comment || ''}</td>
                    <td className="bg-white">{(team.supervisor || []).join(', ')}</td>
                    <td className="bg-white">{team.time}</td>
                  </>
                )}
                <td className="bg-white sticky-col">
                  <div className="flex flex-row items-center justify-center">
                    {editingIndex === index ? (
                      <button className="p-1 cursor-pointer mx-1 text-green-600 hover:text-green-800" onClick={handleSave} title="完了">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                      <button className="p-1 cursor-pointer mx-1 text-gray-600 hover:text-gray-800" onClick={() => setEditingIndex(index)} title="編集">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                    <button className="p-1 cursor-pointer mx-1 text-red-500 hover:text-red-700" onClick={() => handleDeleteTeam(index)} title="削除">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center my-[10px]">
        <button onClick={handleAddNewTeam} className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white">
          {'新規追加'}
        </button>
        <button onClick={handleSave} className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white">
          {'保存'}
        </button>
        <p>
          {'ステータス: '}
          {status}
        </p>
      </div>
      <KanaSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
    </div>
  );
};

export default OtanoshimiAdmin;
