import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent, useMemo } from 'react';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import '../styles/admin-table.css';
import StudentModal from '../components/StudentModal';
import { Link } from 'react-router-dom';
import { SERVER_ENDPOINT } from '../App';

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

const allColumns: { key: keyof student; label: string; className: string; sortable: boolean }[] = [
  { key: 'gakuseki', label: '学籍番号', className: 'w-24', sortable: true },
  { key: 'surname', label: '姓', className: 'w-20', sortable: false },
  { key: 'forename', label: '名', className: 'w-28', sortable: false },
  { key: 'surname_kana', label: '姓かな', className: 'w-24', sortable: false },
  { key: 'forename_kana', label: '名かな', className: 'w-32', sortable: false },
  { key: 'class', label: '組', className: 'w-8', sortable: true },
  { key: 'number', label: '番号', className: 'w-10', sortable: true },
  { key: 'day1id', label: '①研修先', className: 'w-40', sortable: true },
  { key: 'day3id', label: '③研修先', className: 'w-40', sortable: true },
  { key: 'day1bus', label: '①バス', className: 'w-20', sortable: true },
  { key: 'day3bus', label: '③バス', className: 'w-20', sortable: true },
  { key: 'room_tdh', label: 'TDH号室', className: 'w-20', sortable: true },
  { key: 'room_fpr', label: 'FPR号室', className: 'w-20', sortable: true },
  { key: 'shinkansen_day1_car_number', label: 'NSX①車', className: 'w-20', sortable: true },
  { key: 'shinkansen_day1_seat', label: 'NSX①席', className: 'w-20', sortable: true },
  { key: 'shinkansen_day4_car_number', label: 'NSX④車', className: 'w-20', sortable: true },
  { key: 'shinkansen_day4_seat', label: 'NSX④席', className: 'w-20', sortable: true }
];

const getCellClassName = (s: student, field: keyof student) => {
  switch (field) {
    case 'class':
      return CLASS_COLORS[s.class - 1];
    case 'day1id':
      return DAY1_COLORS.find((x) => x[0] === s.day1id)?.[1];
    case 'day3id':
      return DAY3_COLORS.find((x) => x[0] === s.day3id)?.[1];
    default:
      return 'bg-white';
  }
};

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
  room_fpr: 0,
  room_tdh: 0,
  shinkansen_day1_car_number: '',
  shinkansen_day4_car_number: '',
  shinkansen_day1_seat: '',
  shinkansen_day4_seat: ''
};

const Admin = () => {
  const [studentsList, setStudentsList] = useState<student[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm);
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);

  const [editingCell, setEditingCell] = useState<{ studentId: number; field: keyof student } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [visibleColumns, setVisibleColumns] = useState<Array<keyof student>>(allColumns.map((c) => c.key));

  const handleColumnVisibilityChange = (key: keyof student) => {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { key: 'class', direction: 'asc' },
    { key: 'number', direction: 'asc' }
  ]);

  const fetchStudents = async () => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students`);
      if (!response.ok) {
        if (response.status === 404) {
          setStatus('生徒データが見つかりませんでした。');
        } else {
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
        }
      } else {
        const data: student[] = await response.json();
        setStudentsList(data);
        setStatus('');
      }
    } catch (error) {
      console.error('生徒データの取得に失敗:', error);
      setStatus('生徒データの取得中にエラーが発生しました。');
    }
  };

  const handleSort = (key: SortKey, shiftKey: boolean) => {
    setSortConfigs((prevConfigs) => {
      if (!shiftKey) {
        const current = prevConfigs.find((c) => c.key === key);
        if (current && prevConfigs.length === 1) {
          return [{ key, direction: current.direction === 'asc' ? 'desc' : 'asc' }];
        } else {
          return [{ key, direction: 'asc' }];
        }
      }

      const newConfigs: SortConfig[] = [...prevConfigs];
      const configIndex = newConfigs.findIndex((c) => c.key === key);

      if (configIndex > -1) {
        const current = newConfigs[configIndex];
        if (current.direction === 'asc') {
          newConfigs[configIndex] = { ...current, direction: 'desc' };
        } else {
          newConfigs.splice(configIndex, 1);
        }
      } else {
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
        s.surname.toLowerCase().includes(lowercasedQuery) ||
        s.forename.toLowerCase().includes(lowercasedQuery) ||
        s.surname_kana.toLowerCase().includes(lowercasedQuery) ||
        s.forename_kana.toLowerCase().includes(lowercasedQuery) ||
        String(s.gakuseki).includes(lowercasedQuery) ||
        String(COURSES_DAY1.find((x) => x.key === s.day1id)?.name)
          .toLowerCase()
          .includes(lowercasedQuery) ||
        String(COURSES_DAY3.find((x) => x.key === s.day3id)?.name)
          .toLowerCase()
          .includes(lowercasedQuery) ||
        String(s.day1bus).includes(lowercasedQuery) ||
        String(s.day3bus).includes(lowercasedQuery) ||
        String(s.room_tdh).includes(lowercasedQuery) ||
        String(s.room_fpr).includes(lowercasedQuery) ||
        String(s.shinkansen_day1_car_number).includes(lowercasedQuery) ||
        String(s.shinkansen_day1_seat).includes(lowercasedQuery) ||
        String(s.shinkansen_day4_car_number).includes(lowercasedQuery) ||
        String(s.shinkansen_day4_seat).includes(lowercasedQuery)
    );
    return sortList(filtered, sortConfigs);
  }, [studentsList, searchQuery, sortConfigs]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleEditClick = (s: student) => {
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
    if (!window.confirm('本当に削除しますか？')) return;
    setStatus('削除中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students/${gakuseki}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
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
        const response = await fetch(`${SERVER_ENDPOINT}/api/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        if (!response.ok) {
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
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
          throw new Error(`HTTPエラー! ステータス: ${response.status}`);
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
            throw new Error(`HTTPエラー! ステータス: ${response.status}`);
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
    if (modalMode !== null) return;
    setEditingCell({ studentId: student.gakuseki, field });
    setEditingValue(student[field]);
  };

  const handleCellChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingValue(e.target.value);
  };

  const handleCellEditSave = async () => {
    if (!editingCell) return;

    const { studentId, field } = editingCell;

    const originalStudent = studentsList?.find((s) => s.gakuseki === studentId);
    if (originalStudent && originalStudent[field] === editingValue) {
      setEditingCell(null);
      return;
    }

    let valueToSave: string | number = editingValue;
    if (field === 'class' || field === 'number' || field === 'gakuseki' || field === 'shinkansen_day1_car_number' || field === 'shinkansen_day4_car_number') {
      valueToSave = Number(editingValue);
      if (isNaN(valueToSave)) {
        setStatus('無効な数値です。');
        setEditingCell(null);
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
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
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

  const handleCellKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter') {
      handleCellEditSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const renderCellContent = (s: student, field: keyof student) => {
    if (editingCell?.studentId === s.gakuseki && editingCell?.field === field) {
      if (field === 'day1id') {
        return (
          <select value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit">
            {COURSES_DAY1.map((course) => (
              <option key={course.key} value={course.key}>
                {course.short_name}
              </option>
            ))}
          </select>
        );
      }
      if (field === 'day3id') {
        return (
          <select value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit">
            {COURSES_DAY3.map((course) => (
              <option key={course.key} value={course.key}>
                {course.short_name}
              </option>
            ))}
          </select>
        );
      }
      return <input type="text" value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit" />;
    }

    switch (field) {
      case 'day1id':
        return <p className="inline-p-fix">{COURSES_DAY1.find((x) => x.key === s.day1id)?.short_name}</p>;
      case 'day3id':
        return <p className="inline-p-fix">{COURSES_DAY3.find((x) => x.key === s.day3id)?.short_name}</p>;
      default:
        return s[field];
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
      <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 border rounded-md mb-2">
        {allColumns.map((column) => (
          <label key={column.key} className="flex items-center space-x-2">
            <input type="checkbox" checked={visibleColumns.includes(column.key)} onChange={() => handleColumnVisibilityChange(column.key)} />
            <span>{column.label}</span>
          </label>
        ))}
      </div>
      <div className="table-root overflow-y-auto flex flex-grow max-h-[50dvh] max-w-[90dvw] mx-auto rounded-xl">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              {allColumns
                .filter((c) => visibleColumns.includes(c.key))
                .map((column) => (
                  <th className={column.className} key={column.key}>
                    <div className="flex flex-col items-center justify-center">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <button onClick={(e) => handleSort(column.key, e.shiftKey)} disabled={modalMode !== null}>
                          {getSortIndicator(column.key)}
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              <th className="w-20 sticky-col">
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
              <tr key={s.gakuseki}>
                {allColumns
                  .filter((c) => visibleColumns.includes(c.key))
                  .map((column) => (
                    <td key={column.key} className={getCellClassName(s, column.key)} onDoubleClick={() => handleCellDoubleClick(s, column.key)}>
                      {renderCellContent(s, column.key)}
                    </td>
                  ))}
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
              room_fpr: Number(formData.room_fpr) as student['room_fpr'],
              room_tdh: Number(formData.room_tdh) as student['room_tdh'],
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
