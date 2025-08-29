import React, { useState, useEffect, useRef, type ChangeEvent, useMemo } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import { getAuth } from 'firebase/auth';
import '../styles/admin-table.css';
import StudentModal from '../components/StudentModal';
import { sha256 } from '../sha256';
import { ADMIN_HASHES, TEACHER_HASH } from '../accounts';
import { useNavigate } from 'react-router-dom';
// import Button from '../components/Button';

type StudentWithId = student & { id: string };

type SortKey = keyof StudentWithId;
type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

const CLASS_COLORS: string[] = ['bg-red-400', 'bg-gray-400', 'bg-blue-300', 'bg-green-400', 'bg-orange-400', 'bg-blue-600 text-white', 'bg-yellow-400'];
const DAY1_COLORS: [id: string, css: string][] = [
  ['yrp_nifco', 'bg-blue-200'],
  ['yrp_yamashin', 'bg-blue-400'],
  ['yrp_air', 'bg-blue-600 text-white'],
  ['yrp_vtech', 'bg-blue-800 text-white'],
  ['ntt_labo_i', 'bg-red-300'],
  ['ntt_labo_b', 'bg-red-600 text-white'],
  ['kayakku', 'bg-green-300'],
  ['jaxa', 'bg-green-500'],
  ['astro', 'bg-gray-600 text-white'],
  ['arda', 'bg-yellow-300'],
  ['urth_jip', 'bg-purple-300'],
  ['micro', 'bg-gray-400'],
  ['air', 'bg-orange-300']
];
const DAY3_COLORS: [id: string, css: string][] = [
  ['okutama', 'bg-red-300'],
  ['yokosuka', 'bg-blue-300'],
  ['hakone', 'bg-yellow-300'],
  ['kamakura', 'bg-orange-300'],
  ['hakkeijima', 'bg-green-300'],
  ['yokohama', 'bg-gray-400']
];

const sortList = (list: StudentWithId[], configs: SortConfig[]): StudentWithId[] => {
  const sortedList = [...list];
  if (configs.length === 0) {
    return sortedList;
  }
  sortedList.sort((a, b) => {
    for (const config of configs) {
      const { key, direction } = config;
      const aValue = a[key];
      const bValue = b[key];
      const order = direction === 'asc' ? 1 : -1;

      let comparison = 0;
      // nulls/undefined to the end
      if (aValue === null && bValue === null) {
        comparison = 0;
      } else if (aValue === null) {
        comparison = 1;
      } else if (bValue === null) {
        comparison = -1;
      } else if (key === 'day1id') {
        const aName = COURSES_DAY1.find((c) => c.key === aValue)?.name ?? '';
        const bName = COURSES_DAY1.find((c) => c.key === bValue)?.name ?? '';
        comparison = aName.localeCompare(bName);
      } else if (key === 'day3id') {
        const aName = COURSES_DAY3.find((c) => c.key === aValue)?.name ?? '';
        const bName = COURSES_DAY3.find((c) => c.key === bValue)?.name ?? '';
        comparison = aName.localeCompare(bName);
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { numeric: true });
      } else if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }

      if (comparison !== 0) {
        return comparison * order;
      }
    }
    return 0;
  });
  return sortedList;
};

const initialForm: Omit<student, 'class' | 'number' | 'gakuseki'> & { class: string; number: string; gakuseki: string } = {
  surname: '',
  forename: '',
  class: '',
  number: '',
  gakuseki: '',
  day1id: 'yrp_nifco',
  day3id: 'okutama',
  day1bus: '',
  day3bus: '',
  room_shizuoka: '',
  room_tokyo: ''
};

const Admin = () => {
  const [studentsList, setStudentsList] = useState<StudentWithId[] | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null); // 編集中の行ID
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm); // 編集用フォーム
  const [status, setStatus] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false); // 追加モーダル表示状態
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);

  const [editingCell, setEditingCell] = useState<{ studentId: string; field: keyof student } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { key: 'class', direction: 'asc' },
    { key: 'number', direction: 'asc' }
  ]);

  const navigate = useNavigate();

  // Firestoreから生徒データを取得
  const fetchStudents = async () => {
    const snapshot = await getDocs(collection(db, 'students'));
    const list: StudentWithId[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as student), id: docSnap.id });
    });

    setStudentsList(list);
  };

  const handleSort = (key: SortKey, shiftKey: boolean) => {
    setSortConfigs((prevConfigs) => {
      if (!shiftKey) {
        // 通常のクリック: 単一ソート
        const current = prevConfigs.find((c) => c.key === key);
        if (current && prevConfigs.length === 1) {
          // すでにその列でソートされている場合は、方向を切り替える
          return [{ key, direction: current.direction === 'asc' ? 'desc' : 'asc' }];
        } else {
          // 新しい列でソートを開始
          return [{ key, direction: 'asc' }];
        }
      }

      // Shift + クリック: 複数ソート
      const newConfigs: SortConfig[] = [...prevConfigs];
      const configIndex = newConfigs.findIndex((c) => c.key === key);

      if (configIndex > -1) {
        // 既にソート条件に含まれている場合
        const current = newConfigs[configIndex];
        if (current.direction === 'asc') {
          // 昇順 -> 降順
          newConfigs[configIndex] = { ...current, direction: 'desc' };
        } else {
          // 降順 -> ソート条件から削除
          newConfigs.splice(configIndex, 1);
        }
      } else {
        // 新しいソート条件を追加
        newConfigs.push({ key, direction: 'asc' });
      }

      return newConfigs;
    });
  };

  const sortedAndFilteredStudents = useMemo(() => {
    if (!studentsList) {
      return [];
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = studentsList.filter(
      (s) =>
        `${s.surname} ${s.forename}`.toLowerCase().includes(lowercasedQuery) ||
        `${s.surname}${s.forename}`.toLowerCase().includes(lowercasedQuery) ||
        String(s.gakuseki).includes(lowercasedQuery) ||
        String(COURSES_DAY1.find((x) => x.key === s.day1id)?.name)
          .toLowerCase()
          .includes(lowercasedQuery) ||
        String(COURSES_DAY3.find((x) => x.key === s.day3id)?.name)
          .toLowerCase()
          .includes(lowercasedQuery) ||
        String(s.day1bus).includes(lowercasedQuery) ||
        String(s.day3bus).includes(lowercasedQuery) ||
        String(s.room_tokyo).includes(lowercasedQuery) ||
        String(s.room_shizuoka).includes(lowercasedQuery)
    );
    return sortList(filtered, sortConfigs);
  }, [studentsList, searchQuery, sortConfigs]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user && user.email) {
        const beforeAt = user.email.split('@')[0];
        const hash = await sha256(beforeAt);
        const canBeAdmin = ADMIN_HASHES.includes(hash) || TEACHER_HASH === hash;
        setIsAdmin(canBeAdmin);
      } else {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // モーダル編集用
  const handleEditClick = (s: StudentWithId) => {
    setEditRowId(s.id);
    setEditRowForm({
      ...s,
      class: String(s.class),
      number: String(s.number),
      gakuseki: String(s.gakuseki)
    });
    setStatus('');
    setModalMode('edit');
  };

  // 削除処理
  const handleDelete = async (id: string) => {
    if (!window.confirm('本当に削除しますか？')) return;
    setStatus('削除中...');
    try {
      await deleteDoc(doc(db, 'students', id));
      setStatus('生徒データを削除しました。');
      fetchStudents();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  // 新規追加
  const handleAddRow = () => {
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  };

  const handleAddJSONData = () => {
    inputRef.current?.click();
  };

  const handleSave = async (data: student) => {
    if (modalMode === 'add') {
      setStatus('追加中...');
      try {
        await addDoc(collection(db, 'students'), data);
        setStatus('生徒データを追加しました。');
        setModalMode(null);
        fetchStudents();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    } else if (modalMode === 'edit') {
      if (!editRowId) return;
      setStatus('更新中...');
      try {
        await updateDoc(doc(db, 'students', editRowId), data);
        setStatus('生徒データを更新しました。');
        setModalMode(null);
        setEditRowId(null);
        fetchStudents();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    }
  };

  const handleJSONRead = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        const obj = JSON.parse(data) as student[];

        setStatus('更新中...');
        obj.map(async (x) => {
          const colRef = collection(db, 'students');
          // const q = query(colRef, where('forename', '==', x.forename), where('surname', '==', x.surname));
          // TODO: 学籍番号に置き換え
          const q = query(colRef, where('gakuseki', '==', x.gakuseki));
          const snapshot = await getDocs(q);
          const list: StudentWithId[] = [];
          snapshot.forEach((x) => {
            list.push({ ...(x.data() as student), id: x.id });
          });

          if (list.length > 0) {
            try {
              await updateDoc(doc(db, 'students', list[0].id), x);
              console.log('更新しました');
            } catch (e) {
              setStatus('エラーが発生しました: ' + (e as Error).message);
            }
          } else {
            try {
              await addDoc(collection(db, 'students'), x);
              console.log('追加しました');
            } catch (e) {
              setStatus('エラーが発生しました: ' + (e as Error).message);
            }
          }
        });

        setStatus('生徒データを更新しました。');
        setModalMode(null);
        setEditRowId(null);
        fetchStudents();
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleCellDoubleClick = (student: StudentWithId, field: keyof student) => {
    if (modalMode !== null) return;
    setEditingCell({ studentId: student.id, field });
    setEditingValue(student[field]);
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingValue(e.target.value);
  };

  const handleCellEditSave = async () => {
    if (!editingCell) return;

    const { studentId, field } = editingCell;

    const originalStudent = studentsList?.find((s) => s.id === studentId);
    if (originalStudent && originalStudent[field] === editingValue) {
      setEditingCell(null);
      return; // No change
    }

    const studentRef = doc(db, 'students', studentId);

    let valueToSave: string | number = editingValue;
    if (field === 'class' || field === 'number' || field === 'gakuseki') {
      valueToSave = Number(editingValue);
      if (isNaN(valueToSave)) {
        setStatus('無効な数値です。');
        setEditingCell(null); // cancel edit
        return;
      }
    }

    setStatus('更新中...');
    try {
      await updateDoc(studentRef, {
        [field]: valueToSave
      });

      setStudentsList((prevList) => {
        if (!prevList) return null;
        return prevList.map((student) => {
          if (student.id === studentId) {
            return { ...student, [field]: valueToSave };
          }
          return student;
        });
      });
      setStatus('更新しました。');
      setEditingCell(null);
    } catch (error) {
      setStatus('エラーが発生しました: ' + (error as Error).message);
      setEditingCell(null);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      handleCellEditSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  // day1id/day3idの選択肢
  const day1idOptions = ['yrp_nifco', 'yrp_yamashin', 'yrp_air', 'yrp_vtech', 'ntt_labo_i', 'ntt_labo_b', 'kayakku', 'jaxa', 'astro', 'arda', 'urth_jip', 'micro', 'air'];
  const day3idOptions = ['okutama', 'yokosuka', 'hakone', 'kamakura', 'hakkeijima', 'yokohama'];

  if (!authChecked) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'認証中...'}</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'エラー'}</p>
        <p className="text-xl">{'閲覧権限がありません'}</p>
      </div>
    );
  }

  if (!studentsList) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'読込中...'}</p>
      </div>
    );
  }

  const getSortIndicator = (key: SortKey) => {
    const configIndex = sortConfigs.findIndex((c) => c.key === key);
    if (configIndex === -1) {
      return '↕';
    }
    const config = sortConfigs[configIndex];
    const directionIcon = config.direction === 'asc' ? '▲' : '▼';
    if (sortConfigs.length > 1) {
      return `${configIndex + 1}${directionIcon}`;
    }
    return directionIcon;
  };
  return (
    <div className="m-[10px] flex flex-col overflow-hidden">
      <p className="text-sm text-gray-600 my-[10px]">{'ヒント: Shiftキーを押しながら列名をクリックすると、複数の条件でソートできます。'}</p>
      <div className="table-root overflow-y-auto flex-grow max-h-[68dvh]">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'学籍番号'}</span>
                  <button onClick={(e) => handleSort('gakuseki', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('gakuseki')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">{'姓'}</div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">{'名'}</div>
              </th>
              <th className="w-8">
                <div className="flex flex-col items-center justify-center">
                  <span>{'組'}</span>
                  <button onClick={(e) => handleSort('class', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('class')}
                  </button>
                </div>
              </th>
              <th className="w-10">
                <div className="flex flex-col items-center justify-center">
                  <span>{'番号'}</span>
                  <button onClick={(e) => handleSort('number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('number')}
                  </button>
                </div>
              </th>
              <th className="w-40">
                <div className="flex flex-col items-center justify-center">
                  <span>{'1日目研修先'}</span>
                  <button onClick={(e) => handleSort('day1id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1id')}
                  </button>
                </div>
              </th>
              <th className="w-40">
                <div className="flex flex-col items-center justify-center">
                  <span>{'3日目研修先'}</span>
                  <button onClick={(e) => handleSort('day3id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3id')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'1日目ﾊﾞｽ'}</span>
                  <button onClick={(e) => handleSort('day1bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1bus')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'3日目ﾊﾞｽ'}</span>
                  <button onClick={(e) => handleSort('day3bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3bus')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'TDH号室'}</span>
                  <button onClick={(e) => handleSort('room_tokyo', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_tokyo')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'FPR号室'}</span>
                  <button onClick={(e) => handleSort('room_shizuoka', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_shizuoka')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>
                    {'編集'}
                    <br />
                    {'削除'}
                  </span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredStudents.map((s) => (
              <tr key={s.id}>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'gakuseki')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'gakuseki' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.gakuseki
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'surname')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'surname' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.surname
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'forename')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'forename' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.forename
                  )}
                </td>
                <td className={CLASS_COLORS[s.class - 1]} onDoubleClick={() => handleCellDoubleClick(s, 'class')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'class' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.class
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'number')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'number' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.number
                  )}
                </td>
                <td className={DAY1_COLORS.find((x) => x[0] === s.day1id)?.[1]} onDoubleClick={() => handleCellDoubleClick(s, 'day1id')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'day1id' ? (
                    <select value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit">
                      {COURSES_DAY1.map((course) => (
                        <option key={course.key} value={course.key}>
                          {course.short_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="inline-p-fix">{COURSES_DAY1.find((x) => x.key === s.day1id)?.short_name}</p>
                  )}
                </td>
                <td className={DAY3_COLORS.find((x) => x[0] === s.day3id)?.[1]} onDoubleClick={() => handleCellDoubleClick(s, 'day3id')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'day3id' ? (
                    <select value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit">
                      {COURSES_DAY3.map((course) => (
                        <option key={course.key} value={course.key}>
                          {course.short_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="inline-p-fix">{COURSES_DAY3.find((x) => x.key === s.day3id)?.short_name}</p>
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'day1bus')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'day1bus' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.day1bus
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'day3bus')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'day3bus' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.day3bus
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'room_tokyo')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'room_tokyo' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.room_tokyo
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'room_shizuoka')}>
                  {editingCell?.studentId === s.id && editingCell?.field === 'room_shizuoka' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.room_shizuoka
                  )}
                </td>
                <td className="bg-white">
                  <div className="flex flex-row items-center justify-center">
                    <button className="p-1 cursor-pointer mx-1" onClick={() => handleEditClick(s)} disabled={modalMode !== null || editingCell !== null} title="編集">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 hover:text-gray-800" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button className="p-1 cursor-pointer mx-1" onClick={() => handleDelete(s.id)} disabled={modalMode !== null || editingCell !== null} title="削除">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 hover:text-red-700" viewBox="0 0 20 20" fill="currentColor">
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
      <div className="mt-[1dvh]">
        <div className="flex flex-row">
          <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddRow}>
            {'新規追加'}
          </button>
          <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddJSONData}>
            {'JSONで追加'}
          </button>
          <button
            className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white"
            disabled={modalMode !== null}
            onClick={() => {
              navigate('/admin-sha256');
            }}>
            {'SHA256'}
          </button>
        </div>
        <input
          className="m-[10px]"
          ref={inputRef}
          type="file"
          name="json"
          id="json"
          hidden
          accept=".json"
          onChange={(e) => {
            handleJSONRead(e);
          }}
        />
        <div className="my-[10px]">
          <p>
            {'ステータス: '}
            {status}
          </p>
        </div>
        <StudentModal
          open={modalMode !== null}
          mode={modalMode || 'add'}
          onSave={(formData) => {
            const data: student = {
              ...formData,
              day1id: formData.day1id as student['day1id'],
              day3id: formData.day3id as student['day3id'],
              class: Number(formData.class) as student['class'],
              number: Number(formData.number) as student['number'],
              gakuseki: Number(formData.gakuseki) as student['gakuseki']
            };
            handleSave(data);
          }}
          onCancel={() => {
            setModalMode(null);
            setEditRowId(null);
          }}
          initialData={modalMode === 'edit' ? editRowForm : initialForm}
          day1idOptions={day1idOptions}
          day3idOptions={day3idOptions}
        />
        <div className="flex items-center my-[10px]">
          <input type="text" placeholder="検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded mr-2 max-w-[50dvw]" />
          <p className="text-sm text-gray-600 my-2">{'組と番号以外なら何でも検索できます。'}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
