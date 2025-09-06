import { useState, useEffect, useMemo, type FC } from 'react';
import { SERVER_ENDPOINT } from '../App';
import type { student } from '../data/students';
import KanaSearchModal from './KanaSearchModal';

// --- StudentChip Component (from OtanoshimiAdmin) ---
interface StudentChipProps {
  studentId: number;
  studentMap: Map<number, string>;
  onDelete: (studentId: number) => void;
}

const StudentChip: FC<StudentChipProps> = ({ studentId, studentMap, onDelete }) => {
  const studentName = studentMap.get(studentId) || '不明な生徒';
  return (
    <div className="flex items-center bg-blue-100 text-blue-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">
      {studentName}
      <button onClick={() => onDelete(studentId)} className="ml-2 text-blue-800 hover:text-blue-900 cursor-pointer">
        &times;
      </button>
    </div>
  );
};

// --- Main Component ---

interface RollCallGroup {
  id: number;
  name: string;
  student_ids: number[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  allStudents: student[];
  rollCallGroups: RollCallGroup[];
  onGroupsUpdated: () => void;
}

const GroupEditorModal = ({ isOpen, onClose, token, allStudents, rollCallGroups, onGroupsUpdated }: Props) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentGroup, setCurrentGroup] = useState<RollCallGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isKanaModalOpen, setIsKanaModalOpen] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');

  const studentMap = useMemo(() => {
    const newMap = new Map<number, string>();
    for (const student of allStudents) {
      newMap.set(student.gakuseki, `5${student.class}${String(student.number).padStart(2, '0')} ${student.surname} ${student.forename}`);
    }
    return newMap;
  }, [allStudents]);

  useEffect(() => {
    if (currentGroup) {
      setGroupName(currentGroup.name);
      setSelectedStudents(currentGroup.student_ids);
    } else {
      setGroupName('');
      setSelectedStudents([]);
    }
  }, [currentGroup]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStudentSelect = (student: student) => {
    setSelectedStudents((prev) => {
      if (prev.includes(student.gakuseki)) {
        return prev; // Already selected
      } else {
        return [...prev, student.gakuseki];
      }
    });
  };

  const handleAddStudentsFromInput = () => {
    const ids = studentIdInput
      .split(/[,\s]+/)
      .map((idStr) => idStr.trim())
      .filter((idStr) => idStr !== '')
      .map((idStr) => parseInt(idStr, 10));

    const validIds: number[] = [];
    const invalidIds: string[] = [];
    const duplicateIds: number[] = [];

    for (const id of ids) {
      if (isNaN(id)) {
        continue;
      }
      if (!studentMap.has(id)) {
        invalidIds.push(id.toString());
      } else if (selectedStudents.includes(id)) {
        duplicateIds.push(id);
      } else {
        validIds.push(id);
      }
    }

    if (invalidIds.length > 0) {
      alert(`以下の学籍番号は存在しません:\n${invalidIds.join(', ')}`);
    }
    if (duplicateIds.length > 0) {
      // Silently ignore duplicates as they are visually obvious
    }

    if (validIds.length > 0) {
      const uniqueValidIds = [...new Set(validIds)];
      setSelectedStudents((prev) => [...prev, ...uniqueValidIds]);
    }

    setStudentIdInput('');
  };

  const handleStudentDelete = (studentId: number) => {
    setSelectedStudents((prev) => prev.filter((id) => id !== studentId));
  };

  const handleSave = async () => {
    if (!groupName || selectedStudents.length === 0) {
      alert('グループ名を入力し、少なくとも一人の生徒を選択してください。');
      return;
    }

    const url = currentGroup ? `${SERVER_ENDPOINT}/api/roll-call-groups/${currentGroup.id}` : `${SERVER_ENDPOINT}/api/roll-call-groups`;
    const method = currentGroup ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName, student_ids: selectedStudents.sort((a, b) => a - b) })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '保存に失敗しました。');
      }

      onGroupsUpdated();
      setIsEditing(false);
      setCurrentGroup(null);
    } catch (error) {
      console.error('グループの保存に失敗しました:', error);
      alert(`エラー: ${(error as Error).message}`);
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!window.confirm('本当にこのグループを削除しますか？')) return;

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call-groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました。');
      }

      onGroupsUpdated();
    } catch (error) {
      console.error('グループの削除に失敗しました:', error);
      alert((error as Error).message);
    }
  };

  const startNewGroup = () => {
    setCurrentGroup(null);
    setGroupName('');
    setSelectedStudents([]);
    setStudentIdInput('');
    setIsEditing(true);
  };

  const startEditingGroup = (group: RollCallGroup) => {
    setCurrentGroup(group);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setCurrentGroup(null);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] modal-overlay">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full h-[90vh] flex flex-col max-w-[95dvw]" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-2xl font-bold mb-4">{'点呼プリセットの編集'}</h2>

          {isEditing ? (
            <div className="flex-grow flex flex-col min-h-0">
              <div className="mb-4">
                <label htmlFor="group_name" className="block text-gray-700 text-sm font-bold mb-2">
                  {'プリセット名'}
                </label>
                <input type="text" id="group_name" value={groupName} onChange={(e) => setGroupName(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
              </div>
              <div className="flex items-center mb-2 flex-wrap gap-2">
                <p className="font-bold">
                  {'生徒選択 '}
                  {selectedStudents.length}
                  {'人選択中'}
                </p>
                <button onClick={() => setIsKanaModalOpen(true)} className="bg-green-500 text-white py-1 px-3 rounded">
                  {'カタカナ検索で追加'}
                </button>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={studentIdInput}
                    onChange={(e) => setStudentIdInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddStudentsFromInput()}
                    placeholder="学籍番号をコンマ区切りで追加"
                    className="shadow appearance-none border rounded py-1 px-2 text-gray-700 w-64"
                  />
                  <button onClick={handleAddStudentsFromInput} className="ml-2 bg-blue-500 text-white py-1 px-3 rounded">
                    {'追加'}
                  </button>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto border rounded p-2 flex flex-wrap gap-2 content-start">
                {selectedStudents.length > 0 ? (
                  selectedStudents.sort((a, b) => a - b).map((studentId) => <StudentChip key={studentId} studentId={studentId} studentMap={studentMap} onDelete={handleStudentDelete} />)
                ) : (
                  <p className="text-gray-500">{'生徒を選択してください。'}</p>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={closeEditor} className="bg-gray-300 text-black py-2 px-4 rounded">
                  {'キャンセル'}
                </button>
                <button onClick={handleSave} className="bg-blue-500 text-white py-2 px-4 rounded">
                  {'保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-grow flex flex-col">
              <div className="flex-grow overflow-y-auto max-h-[70dvh]">
                <ul>
                  {rollCallGroups.map((group) => (
                    <li key={group.id} className="flex justify-between items-center p-2 border-b">
                      <span>
                        {group.name} ({group.student_ids.length}人)
                      </span>
                      <div className="space-x-2">
                        <button onClick={() => startEditingGroup(group)} className="text-blue-500">
                          {'編集'}
                        </button>
                        <button onClick={() => handleDelete(group.id)} className="text-red-500">
                          {'削除'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 flex justify-between">
                <button onClick={startNewGroup} className="bg-green-500 text-white py-2 px-4 rounded">
                  {'新規プリセット作成'}
                </button>
                <button onClick={onClose} className="bg-gray-500 text-white py-2 px-4 rounded">
                  {'閉じる'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <KanaSearchModal isOpen={isKanaModalOpen} onClose={() => setIsKanaModalOpen(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} closeOnSelect={false} />
    </>
  );
};

export default GroupEditorModal;
