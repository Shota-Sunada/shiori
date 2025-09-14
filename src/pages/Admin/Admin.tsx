import { useState, useEffect, useRef, type ChangeEvent, type KeyboardEvent, useMemo, useCallback, memo, type FC } from 'react';
import type { StudentDTO } from '../../helpers/domainApi';
import { studentApi } from '../../helpers/domainApi';
import { COURSES_DAY1, COURSES_DAY3, type COURSES_DAY1_KEY, type COURSES_DAY3_KEY } from '../../data/courses';
import '../../styles/admin-table.css';
import '../../styles/table.css';
import StudentModal from '../../components/StudentModal';
import { useAuth } from '../../auth-context';
import CenterMessage from '../../components/CenterMessage';
import { clearAppFetchCache } from '../../helpers/apiClient';
import type { IntRange } from 'type-fest';

type SortKey = keyof StudentDTO;
type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

interface MemoizedRowProps {
  s: StudentDTO;
  visibleColumns: Array<keyof StudentDTO>;
  renderCellContent: (s: StudentDTO, field: keyof StudentDTO) => React.ReactNode;
  handleEditClick: (s: StudentDTO) => void;
  handleDelete: (gakuseki: number) => void;
  modalMode: 'add' | 'edit' | null;
  editingCell: { studentId: number; field: keyof StudentDTO } | null;
  handleCellDoubleClick: (s: StudentDTO, field: keyof StudentDTO) => void;
}

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

const allColumns: { key: keyof StudentDTO; label: string; className: string; sortable: boolean }[] = [
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

const getCellClassName = (s: StudentDTO, field: keyof StudentDTO) => {
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

const sortList = (list: StudentDTO[], configs: SortConfig[]): StudentDTO[] => {
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

const initialForm: Omit<StudentDTO, 'class' | 'number' | 'gakuseki' | 'shinkansen_day1_car_number' | 'shinkansen_day4_car_number'> & {
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

const MemoizedRow: FC<MemoizedRowProps> = memo(({ s, visibleColumns, renderCellContent, handleEditClick, handleDelete, modalMode, editingCell, handleCellDoubleClick }) => {
  return (
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
  );
});

const Admin = () => {
  useAuth(); // 認証状態が必要なら呼び出しのみ(将来 user 利用拡張用)
  const [studentsList, setStudentsList] = useState<StudentDTO[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm);
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);

  const [editingCell, setEditingCell] = useState<{ studentId: number; field: keyof StudentDTO } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  const [visibleColumns, setVisibleColumns] = useState<Array<keyof StudentDTO>>(allColumns.map((c) => c.key));

  const handleColumnVisibilityChange = useCallback((key: keyof StudentDTO) => {
    setVisibleColumns((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { key: 'class', direction: 'asc' },
    { key: 'number', direction: 'asc' }
  ]);

  const STUDENTS_CACHE_KEY = 'admin:students';
  const fetchStudents = useCallback(async (force = false) => {
    try {
      const data = await studentApi.list({ alwaysFetch: force, ttlMs: 5 * 60 * 1000, staleWhileRevalidate: true });
      setStudentsList(data);
      setStatus('');
    } catch (error) {
      const msg = (error as Error).message;
      if (msg.includes('404')) setStatus('生徒データが見つかりませんでした。');
      else setStatus('生徒データの取得中にエラーが発生しました。');
      console.error('生徒データの取得に失敗:', error);
    }
  }, []);

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
    const lowercasedQuery = debouncedSearchQuery.toLowerCase();
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
  }, [studentsList, debouncedSearchQuery, sortConfigs]);

  // 現在の表示順・可視列に沿ってCSVを出力
  const handleExportCSV = useCallback(() => {
    const columnsToExport = allColumns.filter((c) => visibleColumns.includes(c.key));
    // ヘッダーはid（key）で出力
    const headers = columnsToExport.map((c) => c.key);

    // 値もid/コード値で出力（day1id, day3idもkeyそのまま）
    const getIdValue = (s: StudentDTO, key: keyof StudentDTO): string => {
      const v = s[key] as unknown;
      return v == null ? '' : String(v);
    };

    const escapeCSV = (value: string) => {
      // 値にカンマ/改行/ダブルクォートが含まれる場合はダブルクォートで囲み、中のダブルクォートは二重化
      const needsQuote = /[",\n\r]/.test(value);
      const escaped = value.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    };

    const lines: string[] = [];
    lines.push(headers.map(escapeCSV).join(','));
    for (const s of sortedAndFilteredStudents) {
      const row = columnsToExport.map((c) => escapeCSV(getIdValue(s, c.key)));
      lines.push(row.join(','));
    }

    const csvContent = lines.join('\r\n'); // Windows互換のCRLF
    const bom = '\uFEFF'; // Excel互換のためBOM付与
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const fileName = `students_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [sortedAndFilteredStudents, visibleColumns]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleEditClick = useCallback((s: StudentDTO) => {
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
  }, []);

  // 削除処理
  const handleDelete = useCallback(
    async (gakuseki: number) => {
      if (!window.confirm('本当に削除しますか？')) return;
      setStatus('削除中...');
      try {
        await studentApi.remove(gakuseki);
        setStatus('生徒データを削除しました。');
        clearAppFetchCache(STUDENTS_CACHE_KEY);
        fetchStudents(true);
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    },
    [fetchStudents]
  );

  // 新規追加
  const handleAddRow = useCallback(() => {
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  }, []);

  const handleAddJSONData = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleSave = useCallback(
    async (data: StudentDTO) => {
      if (modalMode === 'add') {
        setStatus('追加中...');
        try {
          await studentApi.create(data as StudentDTO);
          setStatus('生徒データを追加しました。');
          setModalMode(null);
          clearAppFetchCache(STUDENTS_CACHE_KEY);
          // 基本 create はリスト再取得で反映 (後で最適化可)
          fetchStudents(true);
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
      } else if (modalMode === 'edit') {
        // editRowId は gakuseki に対応
        if (editRowId === null) return; // editRowIdがnullの場合は処理しない
        setStatus('更新中...');
        try {
          await studentApi.update(editRowId, data as Partial<StudentDTO>);
          setStatus('生徒データを更新しました。');
          setModalMode(null);
          setEditRowId(null);
          // 基本 update はリスト再取得で反映 (後で最適化可)
          clearAppFetchCache(STUDENTS_CACHE_KEY);
          fetchStudents(true);
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
      }
    },
    [modalMode, editRowId, fetchStudents]
  );

  const handleJSONRead = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = e.target?.result as string;
          const studentsToProcess = JSON.parse(data) as StudentDTO[];

          setStatus('更新中...');
          try {
            await studentApi.batch(studentsToProcess as unknown as StudentDTO[]);
            setStatus('生徒データを更新しました。');
          } catch (e) {
            setStatus('エラーが発生しました: ' + (e as Error).message);
            // 基本 remove はリスト再取得で反映 (後で最適化可)
          }
          setModalMode(null);
          setEditRowId(null);
          clearAppFetchCache(STUDENTS_CACHE_KEY);
          fetchStudents(true);
        };
        reader.readAsText(e.target.files[0]);
      }
    },
    [fetchStudents]
  );

  const handleCellDoubleClick = useCallback(
    (student: StudentDTO, field: keyof StudentDTO) => {
      if (modalMode !== null) return;
      setEditingCell({ studentId: student.gakuseki, field });
      setEditingValue(student[field]);
    },
    [modalMode]
  );

  const handleCellChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditingValue(e.target.value);
  }, []);

  const handleCellEditSave = useCallback(async () => {
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
      await studentApi.update(studentId, { [field]: valueToSave } as Partial<StudentDTO>, { optimisticList: true });

      setStudentsList((prevList) => {
        if (!prevList) return null;
        return prevList.map((studentItem) => {
          if (studentItem.gakuseki === studentId) {
            return { ...studentItem, [field]: valueToSave } as StudentDTO;
          }
          return studentItem;
        });
      });
      setStatus('更新しました。');
      setEditingCell(null);
    } catch (error) {
      setStatus('エラーが発生しました: ' + (error as Error).message);
      setEditingCell(null);
    }
  }, [editingCell, editingValue, studentsList]);

  const handleCellKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (e.key === 'Enter') {
        handleCellEditSave();
      } else if (e.key === 'Escape') {
        setEditingCell(null);
      }
    },
    [handleCellEditSave]
  );

  const renderCellContent = useCallback(
    (s: StudentDTO, field: keyof StudentDTO) => {
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
    },
    [editingCell, editingValue, handleCellChange, handleCellEditSave, handleCellKeyDown]
  );

  // day1id/day3idの選択肢
  const day1idOptions = ['yrp_nifco', 'yrp_yamashin', 'yrp_air', 'yrp_vtech', 'ntt_labo_i', 'ntt_labo_b', 'kayakku', 'jaxa', 'astro', 'arda', 'urth_jip', 'micro', 'air'];
  const day3idOptions = ['okutama', 'yokosuka', 'hakone', 'kamakura', 'hakkeijima', 'yokohama'];

  if (!studentsList) return <CenterMessage>読込中...</CenterMessage>;
  if (studentsList.length === 0) {
    return (
      <CenterMessage>
        <p className="mb-4">生徒データがありません。</p>
        <button
          className="border-2 border-black p-2 rounded-xl cursor-pointer bg-white"
          onClick={() => {
            setStatus('リロード中...');
            fetchStudents();
          }}>
          リロード
        </button>
        {status && <p className="mt-4 text-sm text-gray-600">{status}</p>}
      </CenterMessage>
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
        <table className="table-base table-rounded table-shadow">
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
              <MemoizedRow
                key={s.gakuseki}
                s={s}
                visibleColumns={visibleColumns}
                renderCellContent={renderCellContent}
                handleEditClick={handleEditClick}
                handleDelete={handleDelete}
                modalMode={modalMode}
                editingCell={editingCell}
                handleCellDoubleClick={handleCellDoubleClick}
              />
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
          <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleExportCSV}>
            {'CSVで保存'}
          </button>
          <button
            className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white"
            disabled={modalMode !== null}
            onClick={async () => {
              setStatus('リロード中...');
              await fetchStudents(true);
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
            const data: StudentDTO = {
              ...formData,
              day1id: formData.day1id as COURSES_DAY1_KEY,
              day3id: formData.day3id as COURSES_DAY3_KEY,
              class: Number(formData.class) as IntRange<1, 8>,
              number: Number(formData.number) as IntRange<1, 8>,
              gakuseki: Number(formData.gakuseki),
              room_fpr: Number(formData.room_fpr),
              room_tdh: Number(formData.room_tdh),
              shinkansen_day1_car_number: Number(formData.shinkansen_day1_car_number) as IntRange<1, 17>,
              shinkansen_day4_car_number: Number(formData.shinkansen_day4_car_number) as IntRange<1, 17>
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
          <input
            type="text"
            placeholder="検索 (氏名 / かな / 学籍番号 / コース名 / バス / 部屋 / NSX)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 rounded mr-2 max-w-[50dvw]"
          />
          <p className="text-sm text-gray-600 my-2">{'氏名・かな・学籍番号・コース・バス・部屋・新幹線情報などで絞り込み可'}</p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
