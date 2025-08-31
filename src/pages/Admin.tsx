import React, { useState, useEffect, useRef, type ChangeEvent, useMemo } from 'react';

import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import '../styles/admin-table.css';
import StudentModal from '../components/StudentModal';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth-context';

type SortKey = keyof student;
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

const sortList = (list: student[], configs: SortConfig[]): student[] => {
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

const initialForm: Omit<student, 'class' | 'number' | 'gakuseki' | 'shinkansen_day1_car_number' | 'shinkansen_day4_car_number'> & {
  class: string;
  number: string;
  gakuseki: string;
  shinkansen_day1_car_number: string;
  shinkansen_day4_car_number: string;
} = {
  surname: '',
  forename: '',
  surname_kana: '',
  forename_kana: '',
  class: '',
  number: '',
  gakuseki: '',
  day1id: 'yrp_nifco',
  day3id: 'okutama',
  day1bus: '',
  day3bus: '',
  room_shizuoka: '',
  room_tokyo: '',
  shinkansen_day1_car_number: '',
  shinkansen_day4_car_number: '',
  shinkansen_day1_seat: '',
  shinkansen_day4_seat: ''
};

import { SERVER_ENDPOINT } from '../app'; // SERVER_ENDPOINT をインポート

const Admin = () => {
  const { user } = useAuth();
  const isAdmin = user?.is_admin ?? false;

  const [studentsList, setStudentsList] = useState<student[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null); // 編集中の行ID (gakuseki)
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm); // 編集用フォーム
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);

  const [editingCell, setEditingCell] = useState<{ studentId: number; field: keyof student } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { key: 'class', direction: 'asc' },
    { key: 'number', direction: 'asc' }
  ]);

  // APIから生徒データを取得
  const fetchStudents = async () => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students`);
      if (!response.ok) {
        if (response.status === 404) {
          setStatus('生徒データが見つかりませんでした。');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        const data: student[] = await response.json();
        setStudentsList(data);
        setStatus(''); // 成功時はステータスをクリア
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStatus('生徒データの取得中にエラーが発生しました。'); // より一般的なエラーメッセージ
    }
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

  // モーダル編集用
  const handleEditClick = (s: student) => {
    if (!isAdmin) return;
    setEditRowId(s.gakuseki);
    setEditRowForm({
      ...s,
      class: String(s.class),
      number: String(s.number),
      gakuseki: String(s.gakuseki),
      shinkansen_day1_car_number: String(s.shinkansen_day1_car_number),
      shinkansen_day4_car_number: String(s.shinkansen_day4_car_number)
    });
    setStatus('');
    setModalMode('edit');
  };

  // 削除処理
  const handleDelete = async (gakuseki: number) => {
    if (!isAdmin) return;
    if (!window.confirm('本当に削除しますか？')) return;
    setStatus('削除中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students/${gakuseki}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      setStatus('生徒データを削除しました。');
      fetchStudents();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  // 新規追加
  const handleAddRow = () => {
    if (!isAdmin) return;
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  };

  const handleAddJSONData = () => {
    if (!isAdmin) return;
    inputRef.current?.click();
  };

  const handleSave = async (data: student) => {
    if (!isAdmin) return;
    if (modalMode === 'add') {
      setStatus('追加中...');
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setStatus('生徒データを追加しました。');
        setModalMode(null);
        fetchStudents();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    } else if (modalMode === 'edit') {
      // editRowId は gakuseki に対応
      if (editRowId === null) return; // editRowIdがnullの場合は処理しない
      setStatus('更新中...');
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/students/${editRowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
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
    if (!isAdmin) return;
    if (e.target.files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as string;
        const studentsToProcess = JSON.parse(data) as student[];

        setStatus('更新中...');
        try {
          const response = await fetch(`${SERVER_ENDPOINT}/api/students/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(studentsToProcess)
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          setStatus('生徒データを更新しました。');
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
        setModalMode(null);
        setEditRowId(null);
        fetchStudents();
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleCellDoubleClick = (student: student, field: keyof student) => {
    if (!isAdmin || modalMode !== null) return;
    setEditingCell({ studentId: student.gakuseki, field });
    setEditingValue(student[field]);
  };

  const handleCellChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingValue(e.target.value);
  };

  const handleCellEditSave = async () => {
    if (!isAdmin || !editingCell) return;

    const { studentId, field } = editingCell; // studentId は gakuseki に対応

    const originalStudent = studentsList?.find((s) => s.gakuseki === studentId);
    if (originalStudent && originalStudent[field] === editingValue) {
      setEditingCell(null);
      return; // No change
    }

    let valueToSave: string | number = editingValue;
    if (field === 'class' || field === 'number' || field === 'gakuseki' || field === 'shinkansen_day1_car_number' || field === 'shinkansen_day4_car_number') {
      valueToSave = Number(editingValue);
      if (isNaN(valueToSave)) {
        setStatus('無効な数値です。');
        setEditingCell(null); // cancel edit
        return;
      }
    }

    setStatus('更新中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ [field]: valueToSave })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setStudentsList((prevList) => {
        if (!prevList) return null;
        return prevList.map((student) => {
          if (student.gakuseki === studentId) {
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
    <div className="p-[5px] flex flex-col">
      <div className="table-root overflow-y-auto flex flex-grow max-h-[60dvh] max-w-[90dvw] mx-auto rounded-xl">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white z-10">
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
              <th className="w-28">
                <div className="flex flex-col items-center justify-center">{'名'}</div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">{'姓かな'}</div>
              </th>
              <th className="w-32">
                <div className="flex flex-col items-center justify-center">{'名かな'}</div>
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
                  <span>{'①研修先'}</span>
                  <button onClick={(e) => handleSort('day1id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1id')}
                  </button>
                </div>
              </th>
              <th className="w-40">
                <div className="flex flex-col items-center justify-center">
                  <span>{'③研修先'}</span>
                  <button onClick={(e) => handleSort('day3id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3id')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'①バス'}</span>
                  <button onClick={(e) => handleSort('day1bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1bus')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'③バス'}</span>
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
                  <span>{'NSX①車'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day1_car_number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day1_car_number')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX①席'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day1_seat', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day1_seat')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX④車'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day4_car_number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day4_car_number')}
                  </button>
                </div>
              </th>
              <th className="w-20">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX④席'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day4_seat', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day4_seat')}
                  </button>
                </div>
              </th>
              {isAdmin && (
                <th className="w-20 sticky-col">
                  <div className="flex flex-col items-center justify-center">
                    <span>
                      {'編集'}
                      <br />
                      {'削除'}
                    </span>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredStudents.map((s) => (
              <tr key={s.gakuseki}>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'gakuseki')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'gakuseki' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.gakuseki
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'surname')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'surname' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.surname
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'forename')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'forename' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.forename
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'surname_kana')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'surname_kana' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.surname_kana
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'forename_kana')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'forename_kana' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.forename_kana
                  )}
                </td>
                <td className={CLASS_COLORS[s.class - 1]} onDoubleClick={() => handleCellDoubleClick(s, 'class')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'class' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.class
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'number')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'number' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.number
                  )}
                </td>
                <td className={DAY1_COLORS.find((x) => x[0] === s.day1id)?.[1]} onDoubleClick={() => handleCellDoubleClick(s, 'day1id')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'day1id' ? (
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
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'day3id' ? (
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
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'day1bus' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.day1bus
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'day3bus')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'day3bus' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.day3bus
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'room_tokyo')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'room_tokyo' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.room_tokyo
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'room_shizuoka')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'room_shizuoka' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.room_shizuoka
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'shinkansen_day1_car_number')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'shinkansen_day1_car_number' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.shinkansen_day1_car_number
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'shinkansen_day1_seat')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'shinkansen_day1_seat' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.shinkansen_day1_seat
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'shinkansen_day4_car_number')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'shinkansen_day4_car_number' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.shinkansen_day4_car_number
                  )}
                </td>
                <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(s, 'shinkansen_day4_seat')}>
                  {editingCell?.studentId === s.gakuseki && editingCell?.field === 'shinkansen_day4_seat' ? (
                    <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />
                  ) : (
                    s.shinkansen_day4_seat
                  )}
                </td>
                {isAdmin && (
                  <td className="bg-white sticky-col">
                    <div className="flex flex-row items-center justify-center">
                      <button className="p-1 cursor-pointer mx-1" onClick={() => handleEditClick(s)} disabled={modalMode !== null || editingCell !== null} title="編集">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 hover:text-gray-800" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button className="p-1 cursor-pointer mx-1" onClick={() => handleDelete(s.gakuseki)} disabled={modalMode !== null || editingCell !== null} title="削除">
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
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-gray-600 my-[10px]">
        <p>{'Tips: Shiftキーを押しながら列名をクリックすると、最大2個の条件でソートできます。'}</p>
        <p>{'※①: 1日目、②: 2日目、③: 3日目、④: 4日目 です。'}</p>
        <p>{'※TDH: 東京ドームホテル、FPR: フジプレミアムリゾートです。'}</p>
        <p>{'※NSXは、Nozomi Super Express (=新幹線) のことです。'}</p>
      </div>
      <div>
        {isAdmin && (
          <div className="flex flex-row">
            <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddRow}>
              {'新規追加'}
            </button>
            <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddJSONData}>
              {'JSONで更新'}
            </button>
            <Link to={modalMode !== null ? '/admin-sha256' : ''} className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white">
              {'SHA256'}
            </Link>
            <button
              className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white"
              disabled={modalMode !== null}
              onClick={async () => {
                setStatus('リロード中...');
                await fetchStudents();
                setStatus('リロード完了');
              }}>
              {'リロード'}
            </button>
          </div>
        )}
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
              gakuseki: Number(formData.gakuseki) as student['gakuseki'],
              shinkansen_day1_car_number: Number(formData.shinkansen_day1_car_number) as student['shinkansen_day1_car_number'],
              shinkansen_day4_car_number: Number(formData.shinkansen_day4_car_number) as student['shinkansen_day4_car_number']
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
