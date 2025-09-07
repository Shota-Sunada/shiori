import { useState, useEffect, useMemo, useCallback, memo, type ChangeEvent, type KeyboardEvent, type FC } from 'react';
import { useRequireAuth } from '../auth-context';
import '../styles/admin-table.css';
import { SERVER_ENDPOINT } from '../App';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';

export interface Teacher {
  id: number;
  surname: string;
  forename: string;
  room_fpr: number;
  room_tdh: number;
  shinkansen_day1_car_number: number;
  shinkansen_day1_seat: string;
  shinkansen_day4_car_number: number;
  shinkansen_day4_seat: string;
  day1id: string;
  day1bus: number;
  day3id: string;
  day3bus: number;
  day4class: number;
}

interface MemoizedTeacherRowProps {
  t: Teacher;
  handleDelete: (id: number) => void;
  modalMode: 'add' | 'edit' | null;
  renderCellContent: (t: Teacher, field: keyof Teacher) => React.ReactNode;
  handleCellDoubleClick: (t: Teacher, field: keyof Teacher) => void;
}

interface TeacherModalProps {
  modalMode: 'add' | 'edit' | null;
  editRowForm: typeof initialForm;
  handleSave: (formData: typeof initialForm) => void;
  setModalMode: (mode: 'add' | 'edit' | null) => void;
  setEditRowForm: (form: typeof initialForm) => void;
  day1idOptions: { key: string; name: string; short_name: string }[];
  day3idOptions: { key: string; name: string; short_name: string }[];
}

type SortKey = keyof Teacher;
type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

const sortList = (list: Teacher[], configs: SortConfig[]): Teacher[] => {
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

const initialForm = {
  id: '',
  surname: '',
  forename: '',
  room_fpr: 0,
  room_tdh: 0,
  shinkansen_day1_car_number: 0,
  shinkansen_day1_seat: '',
  shinkansen_day4_car_number: 0,
  shinkansen_day4_seat: '',
  day1id: '',
  day1bus: 0,
  day3id: '',
  day3bus: 0,
  day4class: 0,
};

const MemoizedTeacherRow: FC<MemoizedTeacherRowProps> = memo(({ t, handleDelete, modalMode, renderCellContent, handleCellDoubleClick }) => {
  return (
    <tr key={t.id} className={'bg-white'}>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'id')}>
        {renderCellContent(t, 'id')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'surname')}>
        {renderCellContent(t, 'surname')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'forename')}>
        {renderCellContent(t, 'forename')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'room_fpr')}>
        {renderCellContent(t, 'room_fpr')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'room_tdh')}>
        {renderCellContent(t, 'room_tdh')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'shinkansen_day1_car_number')}>
        {renderCellContent(t, 'shinkansen_day1_car_number')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'shinkansen_day1_seat')}>
        {renderCellContent(t, 'shinkansen_day1_seat')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'shinkansen_day4_car_number')}>
        {renderCellContent(t, 'shinkansen_day4_car_number')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'shinkansen_day4_seat')}>
        {renderCellContent(t, 'shinkansen_day4_seat')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'day1id')}>
        {renderCellContent(t, 'day1id')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'day1bus')}>
        {renderCellContent(t, 'day1bus')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'day3id')}>
        {renderCellContent(t, 'day3id')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'day3bus')}>
        {renderCellContent(t, 'day3bus')}
      </td>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(t, 'day4class')}>
        {renderCellContent(t, 'day4class')}
      </td>
      <td className="bg-white sticky-col">
        <div className="flex flex-row items-center justify-center">
          <button className="p-1 cursor-pointer mx-1" onClick={() => handleDelete(t.id)} disabled={modalMode !== null} title="削除">
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

const TeacherModal: FC<TeacherModalProps> = memo(({ modalMode, editRowForm, handleSave, setModalMode, setEditRowForm, day1idOptions, day3idOptions }) => {
  if (modalMode === null) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 modal-overlay">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{modalMode === 'add' ? '先生追加' : '先生編集'}</h2>
        <form
        className='grid grid-cols-2 gap-2'
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(editRowForm);
          }}>
          <div className="mb-4">
            <label htmlFor="id" className="block text-gray-700 text-sm font-bold mb-2">
              {'ID (8桁の数字)'}
            </label>
            <input
              type="number"
              id="id"
              name="id"
              value={editRowForm.id}
              onChange={(e) => setEditRowForm({ ...editRowForm, id: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
              disabled={modalMode === 'edit'}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="surname" className="block text-gray-700 text-sm font-bold mb-2">
              {'姓'}
            </label>
            <input
              type="text"
              id="surname"
              name="surname"
              value={editRowForm.surname}
              onChange={(e) => setEditRowForm({ ...editRowForm, surname: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="forename" className="block text-gray-700 text-sm font-bold mb-2">
              {'名'}
            </label>
            <input
              type="text"
              id="forename"
              name="forename"
              value={editRowForm.forename}
              onChange={(e) => setEditRowForm({ ...editRowForm, forename: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="room_fpr" className="block text-gray-700 text-sm font-bold mb-2">
              {'FPR'}
            </label>
            <input
              type="number"
              id="room_fpr"
              name="room_fpr"
              value={editRowForm.room_fpr}
              onChange={(e) => setEditRowForm({ ...editRowForm, room_fpr: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="room_tdh" className="block text-gray-700 text-sm font-bold mb-2">
              {'TDH'}
            </label>
            <input
              type="number"
              id="room_tdh"
              name="room_tdh"
              value={editRowForm.room_tdh}
              onChange={(e) => setEditRowForm({ ...editRowForm, room_tdh: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="shinkansen_day1_car_number" className="block text-gray-700 text-sm font-bold mb-2">
              {'NSX①号車'}
            </label>
            <input
              type="number"
              id="shinkansen_day1_car_number"
              name="shinkansen_day1_car_number"
              value={editRowForm.shinkansen_day1_car_number}
              onChange={(e) => setEditRowForm({ ...editRowForm, shinkansen_day1_car_number: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="shinkansen_day1_seat" className="block text-gray-700 text-sm font-bold mb-2">
              {'NSX①座席'}
            </label>
            <input
              type="text"
              id="shinkansen_day1_seat"
              name="shinkansen_day1_seat"
              value={editRowForm.shinkansen_day1_seat}
              onChange={(e) => setEditRowForm({ ...editRowForm, shinkansen_day1_seat: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="shinkansen_day4_car_number" className="block text-gray-700 text-sm font-bold mb-2">
              {'NSX④号車'}
            </label>
            <input
              type="number"
              id="shinkansen_day4_car_number"
              name="shinkansen_day4_car_number"
              value={editRowForm.shinkansen_day4_car_number}
              onChange={(e) => setEditRowForm({ ...editRowForm, shinkansen_day4_car_number: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="shinkansen_day4_seat" className="block text-gray-700 text-sm font-bold mb-2">
              {'NSX④座席'}
            </label>
            <input
              type="text"
              id="shinkansen_day4_seat"
              name="shinkansen_day4_seat"
              value={editRowForm.shinkansen_day4_seat}
              onChange={(e) => setEditRowForm({ ...editRowForm, shinkansen_day4_seat: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="day1id" className="block text-gray-700 text-sm font-bold mb-2">
              {'1日目ID'}
            </label>
            <select
              id="day1id"
              name="day1id"
              value={editRowForm.day1id}
              onChange={(e) => setEditRowForm({ ...editRowForm, day1id: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option key="" value="">なし</option>
              {day1idOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.short_name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="day1bus" className="block text-gray-700 text-sm font-bold mb-2">
              {'1日目バス'}
            </label>
            <input
              type="number"
              id="day1bus"
              name="day1bus"
              value={editRowForm.day1bus}
              onChange={(e) => setEditRowForm({ ...editRowForm, day1bus: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="day3id" className="block text-gray-700 text-sm font-bold mb-2">
              {'3日目ID'}
            </label>
            <select
              id="day3id"
              name="day3id"
              value={editRowForm.day3id}
              onChange={(e) => setEditRowForm({ ...editRowForm, day3id: e.target.value })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option key="" value="">なし</option>
              {day3idOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.short_name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="day3bus" className="block text-gray-700 text-sm font-bold mb-2">
              {'3日目バス'}
            </label>
            <input
              type="number"
              id="day3bus"
              name="day3bus"
              value={editRowForm.day3bus}
              onChange={(e) => setEditRowForm({ ...editRowForm, day3bus: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="day4class" className="block text-gray-700 text-sm font-bold mb-2">
              {'4日目クラス'}
            </label>
            <input
              type="number"
              id="day4class"
              name="day4class"
              value={editRowForm.day4class}
              onChange={(e) => setEditRowForm({ ...editRowForm, day4class: Number(e.target.value) })}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          <div className="flex items-center justify-between">
            <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              {modalMode === 'add' ? '追加' : '更新'}
            </button>
            <button type="button" onClick={() => setModalMode(null)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">
              {'キャンセル'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const TeacherAdmin = () => {
  const { user, token, loading } = useRequireAuth();
  const [teachersList, setTeachersList] = useState<Teacher[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm);
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCell, setEditingCell] = useState<{ teacherId: number; field: keyof Teacher } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ key: 'id', direction: 'asc' }]);

  const fetchTeachers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/teachers`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const data: Teacher[] = await response.json();
      setTeachersList(data);
    } catch (error) {
      console.error('先生の取得に失敗:', error);
      setStatus('先生データの取得に失敗しました。');
    }
  }, [token]);

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

  const sortedAndFilteredTeachers = useMemo(() => {
    if (!teachersList) {
      return [];
    }
    const lowercasedQuery = debouncedSearchQuery.toLowerCase();
    const filtered = teachersList.filter((t) =>
      String(t.id).includes(lowercasedQuery) ||
      t.surname.toLowerCase().includes(lowercasedQuery) ||
      t.forename.toLowerCase().includes(lowercasedQuery)
    );
    return sortList(filtered, sortConfigs);
  }, [teachersList, debouncedSearchQuery, sortConfigs]);

  useEffect(() => {
    if (!loading && user) {
      fetchTeachers();
    }
  }, [user, loading, token, fetchTeachers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('本当に削除しますか？')) return;
    setStatus('削除中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/teachers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      setStatus('先生を削除しました。');
      fetchTeachers();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  const handleAddRow = () => {
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  };

  const handleSave = async (formData: typeof initialForm) => {
    if (!token) return;
    const id = Number(formData.id);

    // 8桁のIDバリデーション
    if (!/^[0-9]{8}$/.test(id.toString())) {
      setStatus('IDは8桁の数字である必要があります。');
      return;
    }

    if (modalMode === 'add') {
      setStatus('追加中...');
      try {
        const response = await fetch(`${SERVER_ENDPOINT}/api/teachers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            id,
            surname: formData.surname,
            forename: formData.forename,
            room_fpr: formData.room_fpr,
            room_tdh: formData.room_tdh,
            shinkansen_day1_car_number: formData.shinkansen_day1_car_number,
            shinkansen_day1_seat: formData.shinkansen_day1_seat,
            shinkansen_day4_car_number: formData.shinkansen_day4_car_number,
            shinkansen_day4_seat: formData.shinkansen_day4_seat,
            day1id: formData.day1id,
            day1bus: formData.day1bus,
            day3id: formData.day3id,
            day3bus: formData.day3bus,
            day4class: formData.day4class,
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTPエラー! ステータス: ${response.status}`);
        }
        setStatus('先生を追加しました。');
        setModalMode(null);
        fetchTeachers();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    } else if (modalMode === 'edit') {
      if (editRowId === null) return;
      setStatus('更新中...');
      try {
        const body = {
          surname: formData.surname,
          forename: formData.forename,
          room_fpr: formData.room_fpr,
          room_tdh: formData.room_tdh,
          shinkansen_day1_car_number: formData.shinkansen_day1_car_number,
          shinkansen_day1_seat: formData.shinkansen_day1_seat,
          shinkansen_day4_car_number: formData.shinkansen_day4_car_number,
          shinkansen_day4_seat: formData.shinkansen_day4_seat,
          day1id: formData.day1id,
          day1bus: formData.day1bus,
          day3id: formData.day3id,
          day3bus: formData.day3bus,
          day4class: formData.day4class,
        };

        const response = await fetch(`${SERVER_ENDPOINT}/api/teachers/${editRowId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTPエラー! ステータス: ${response.status}`);
        }
        setStatus('先生を更新しました。');
        setModalMode(null);
        setEditRowId(null);
        fetchTeachers();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    }
  };

  const handleCellDoubleClick = (t: Teacher, field: keyof Teacher) => {
    if (modalMode !== null) return;
    setEditingCell({ teacherId: t.id, field });
    setEditingValue(t[field]);
  };

  const handleCellChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { value } = e.target;
    setEditingValue(value);
  };

  const handleCellEditSave = async () => {
    if (!editingCell) return;

    const { teacherId, field } = editingCell;

    const originalTeacher = teachersList?.find((t) => t.id === teacherId);
    if (originalTeacher && originalTeacher[field] === editingValue) {
      setEditingCell(null);
      return;
    }

    let valueToSave: string | number = editingValue;

    // Explicitly handle type conversions for new fields and existing number fields
    if (['room_fpr', 'room_tdh', 'shinkansen_day1_car_number', 'shinkansen_day4_car_number', 'day1bus', 'day3bus', 'day4class'].includes(field as string)) {
      valueToSave = Number(editingValue);
      if (isNaN(valueToSave)) {
        setStatus('無効な数値です。');
        setEditingCell(null);
        return;
      }
    }
    // For string fields (day1id, day3id, surname, forename, shinkansen_day1_seat, shinkansen_day4_seat), no conversion needed.

    setStatus('更新中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/teachers/${teacherId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: valueToSave })
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }

      setTeachersList((prevList) => {
        if (!prevList) return null;
        return prevList.map((teacher) => {
          if (teacher.id === teacherId) {
            return { ...teacher, [field]: valueToSave };
          }
          return teacher;
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

  const renderCellContent = (t: Teacher, field: keyof Teacher) => {
    if (editingCell?.teacherId === t.id && editingCell?.field === field) {
      if (field === 'day1id') {
        return (
          <select value={editingValue} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="inline-edit">
            <option key="" value="">{"未登録"}</option>
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
            <option key="" value="">{"未登録"}</option>
            {COURSES_DAY3.map((course) => (
              <option key={course.key} value={course.key}>
                {course.short_name}
              </option>
            ))}
          </select>
        );
      }
      // Determine input type based on field
      let inputType = 'text';
      if (['room_fpr', 'room_tdh', 'shinkansen_day1_car_number', 'shinkansen_day4_car_number', 'day1bus', 'day3bus', 'day4class'].includes(field as string)) {
        inputType = 'number';
      }

      return <input type={inputType} value={editingValue as string} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="w-full" />;
    }
    switch (field) {
      case 'day1id':
        return <p className="inline-p-fix">{COURSES_DAY1.find((x) => x.key === t.day1id)?.short_name || "未登録"}</p>;
      case 'day3id':
        return <p className="inline-p-fix">{COURSES_DAY3.find((x) => x.key === t.day3id)?.short_name|| "未登録"}</p>;
      default:
        return t[field];
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80dvh]">
        <p className="text-xl">{'認証中...'}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!teachersList) {
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
                  <span>{'ID'}</span>
                  <button onClick={(e) => handleSort('id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('id')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'姓'}</span>
                  <button onClick={(e) => handleSort('surname', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('surname')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'名'}</span>
                  <button onClick={(e) => handleSort('forename', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('forename')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'FPR'}</span>
                  <button onClick={(e) => handleSort('room_fpr', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_fpr')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'TDH'}</span>
                  <button onClick={(e) => handleSort('room_tdh', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_tdh')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX①号車'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day1_car_number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day1_car_number')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX①座席'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day1_seat', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day1_seat')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX④号車'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day4_car_number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day4_car_number')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'NSX④座席'}</span>
                  <button onClick={(e) => handleSort('shinkansen_day4_seat', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('shinkansen_day4_seat')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'①研修先'}</span>
                  <button onClick={(e) => handleSort('day1id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1id')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'①バス'}</span>
                  <button onClick={(e) => handleSort('day1bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1bus')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'③研修先'}</span>
                  <button onClick={(e) => handleSort('day3id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3id')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'③バス'}</span>
                  <button onClick={(e) => handleSort('day3bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3bus')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'④クラス'}</span>
                  <button onClick={(e) => handleSort('day4class', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day4class')}
                  </button>
                </div>
              </th>
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
            {sortedAndFilteredTeachers.map((t) => (
              <MemoizedTeacherRow
                key={t.id}
                t={t}
                handleDelete={handleDelete}
                modalMode={modalMode}
                renderCellContent={renderCellContent}
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
          <button
            className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white"
            disabled={modalMode !== null}
            onClick={async () => {
              setStatus('リロード中...');
              await fetchTeachers();
              setStatus('リロード完了');
            }}>
            {'リロード'}
          </button>
        </div>
        <div className="my-[10px]">
          <p>
            {'ステータス: '}
            {status}
          </p>
        </div>
        <TeacherModal modalMode={modalMode} editRowForm={editRowForm} handleSave={handleSave} setModalMode={setModalMode} setEditRowForm={setEditRowForm} day1idOptions={COURSES_DAY1} day3idOptions={COURSES_DAY3} />
        <div className="flex items-center my-[10px]">
          <input type="text" placeholder="検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded mr-2 max-w-[50dvw]" />
          <p className="text-sm text-gray-600 my-2">{'ID、姓、名で検索できます。'}</p>
        </div>
      </div>
    </div>
  );
};

export default TeacherAdmin;