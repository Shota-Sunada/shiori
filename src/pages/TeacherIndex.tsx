import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import KanaSearchModal from '../components/KanaSearchModal';
import { SERVER_ENDPOINT } from '../App';
import IndexTable from '../components/IndexTable';
import Button from '../components/Button';
import GroupEditorModal from '../components/GroupEditorModal';

interface RollCallGroup {
  id: number;
  name: string;
  student_ids: number[];
}

const TeacherIndex = () => {
  const { user, token, loading } = useAuth();
  const navigate = useNavigate();

  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [studentData, setStudentData] = useState<student | null>(null);
  const [isKanaSearchVisible, setKanaSearchVisible] = useState(false);
  const [specificStudentId, setSpecificStudentId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [targetStudents, setTargetStudents] = useState<string>('default');
  const [rollCallGroups, setRollCallGroups] = useState<RollCallGroup[]>([]);
  const [isGroupEditorOpen, setGroupEditorOpen] = useState(false);

  const fetchRollCallGroups = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call-groups`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const groups = await response.json();
      setRollCallGroups(groups);
    } catch (error) {
      console.error('点呼グループの取得に失敗:', error);
    }
  }, [token]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchAllStudents = async () => {
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
        const students = await response.json();
        students.sort((a: student, b: student) => {
          if (a.gakuseki < b.gakuseki) {
            return -1;
          }
          if (a.gakuseki > b.gakuseki) {
            return 1;
          }
          return 0;
        });
        setAllStudents(students);
      } catch (error) {
        console.error('生徒データの取得に失敗:', error);
      }
    };

    if (token) {
      fetchAllStudents();
      fetchRollCallGroups();
    }
  }, [token, fetchRollCallGroups]);

  const handleStudentSelect = (student: student) => {
    setStudentData(student);
    setKanaSearchVisible(false);
    window.scrollTo({ top: document.getElementById('table')?.offsetTop, behavior: 'smooth' });
  };

  const handleCallSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!user || !token) {
      alert('ログインしていません。');
      return;
    }

    if (specificStudentId) {
      if (!window.confirm(`学籍番号【${specificStudentId}】の生徒に点呼を発動します。\nよろしいですか?`)) {
        alert('点呼を中止しました。');
        return;
      }
    } else {
      if (targetStudents === 'default') {
        alert('送信先のプリセットを選択してください。');
        return;
      } else if (targetStudents === 'all') {
        if (!window.confirm('現在、\n【 全員 】\nに通知を送信する設定です。\n生徒全員に対して一斉に点呼がかかりますが、よろしいですか?')) {
          alert('点呼を中止しました。');
          return;
        }
      } else {
        if (!window.confirm(`現在、\n【${rollCallGroups.find((x) => x.name === targetStudents)?.name}】\nに通知を送信する設定です。\nよろしいですか?`)) {
          alert('点呼を中止しました。');
          return;
        }
      }
    }

    const requestBody: {
      teacher_id: number;
      duration_minutes: number;
      specific_student_id?: string;
      group_name?: string;
    } = {
      teacher_id: Number(user.userId),
      duration_minutes: durationMinutes
    };

    if (specificStudentId) {
      requestBody.specific_student_id = specificStudentId;
    } else if (targetStudents !== 'all') {
      requestBody.group_name = targetStudents;
    }

    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/roll-call/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTPエラー! ステータス: ${response.status}`);
      }

      const data = await response.json();
      const { rollCallId } = data;

      navigate(`/teacher/call?id=${rollCallId}`);
    } catch (error) {
      console.error('点呼の開始に失敗しました:', error);
      alert(`点呼の開始に失敗しました.\n${(error as Error).message}`);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <p className="m-[10px] text-2xl">{'ようこそ、先生用ページへ'}</p>

      <section id="search" className="m-2 flex flex-col items-center">
        <div className="flex flex-col items-center">
          <p className="m-[10px] text-2xl">{'生徒情報検索'}</p>
          <button
            onClick={() => {
              setKanaSearchVisible(true);
            }}
            className="p-2 ml-2 text-white bg-green-500 rounded cursor-pointer">
            {'生徒カタカナ検索'}
          </button>
        </div>
      </section>

      <IndexTable studentData={studentData} />

      <section id="call" className="m-2 w-full max-w-md mx-auto">
        <div className="flex flex-col items-center bg-gray-100 p-6 rounded-lg shadow-md">
          <div className="flex flex-col justify-between items-center w-full">
            <p className="m-[10px] text-2xl font-bold">{'点呼システム'}</p>
            <Button text="点呼一覧へ" arrowRight link="/teacher/roll-call-list" />
            <button onClick={() => setGroupEditorOpen(true)} className="mt-2 text-blue-500 underline">
              {'点呼グループを編集'}
            </button>
          </div>

          <form className="w-full mt-4" onSubmit={handleCallSubmit}>
            <div className="mb-4">
              <label htmlFor="target_students" className="block text-gray-700 text-sm font-bold mb-2">
                {'対象の生徒'}
              </label>
              <select
                name="target_students"
                id="target_students"
                value={targetStudents}
                onChange={(e) => {
                  setTargetStudents(e.target.value);
                }}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline bg-white">
                <option value="default">{'選択してください'}</option>
                <option value="all">{'【取扱注意】全員'}</option>
                {rollCallGroups.map((group) => (
                  <option key={group.id} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">{'点呼時間 (分)'}</label>
              <div className="flex justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((period) => (
                  <button
                    type="button"
                    key={period}
                    onClick={() => setDurationMinutes(period)}
                    className={`py-2 px-4 rounded cursor-pointer focus:outline-none ${durationMinutes === period ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label htmlFor="specific_student_id" className="block text-gray-700 text-sm font-bold mb-2">
                {'特定生徒に送信 (学籍番号)'}
              </label>
              <input
                type="text"
                name="specific_student_id"
                id="specific_student_id"
                placeholder="学籍番号を入力..."
                value={specificStudentId}
                onChange={(e) => setSpecificStudentId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
              <p className="text-xs text-gray-600 mt-1">{'ここに学籍番号を入力すると、その生徒にのみ通知が送信されます。空の場合は、上で選択中の生徒に送信されます。'}</p>
            </div>
            <div className="flex items-center justify-center">
              <button type="submit">
                <Button text="点呼開始" arrowRight />
              </button>
            </div>
          </form>
        </div>
      </section>

      <KanaSearchModal isOpen={isKanaSearchVisible} onClose={() => setKanaSearchVisible(false)} allStudents={allStudents} onStudentSelect={handleStudentSelect} />
      <GroupEditorModal
        isOpen={isGroupEditorOpen}
        onClose={() => setGroupEditorOpen(false)}
        token={token}
        allStudents={allStudents}
        rollCallGroups={rollCallGroups}
        onGroupsUpdated={fetchRollCallGroups}
      />
    </div>
  );
};

export default TeacherIndex;
