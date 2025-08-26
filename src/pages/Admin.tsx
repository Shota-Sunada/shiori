import React, { useState, useEffect, useRef, type ChangeEvent, useMemo } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import { getAuth } from 'firebase/auth';
import '../styles/admin-table.css';
import StudentModal from '../components/StudentModal';
import Button from '../components/Button';

// SHA256ハッシュ化関数
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const adminHashes = ['0870101e9e5273808a04d54a147f4060c5442e30cf8ab81c693c534d2cb95222'];

type StudentWithId = student & { id: string };

type SortKey = keyof StudentWithId;
type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

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

const Admin: React.FC = () => {
  const [studentsList, setStudentsList] = useState<StudentWithId[] | null>(null);
  const [editRowId, setEditRowId] = useState<string | null>(null); // 編集中の行ID
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm); // 編集用フォーム
  const [status, setStatus] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false); // 追加モーダル表示状態
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([
    { key: 'class', direction: 'asc' },
    { key: 'number', direction: 'asc' }
  ]);

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
        setIsAdmin(adminHashes.includes(hash));
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

  // day1id/day3idの選択肢
  const day1idOptions = ['yrp_nifco', 'yrp_yamashin', 'yrp_air', 'yrp_vtech', 'ntt_labo_i', 'ntt_labo_b', 'kayakku', 'jaxa', 'astro', 'arda', 'urth_jip', 'micro', 'air'];
  const day3idOptions = ['okutama', 'yokosuka', 'hakone', 'kamakura', 'hakkeijima', 'yokohama'];

  if (!authChecked) {
    return <div>{'認証確認中...'}</div>;
  }
  if (!isAdmin) {
    return <div>{'権限がありません。'}</div>;
  }

  if (!studentsList) {
    return <div>{'読込中...'}</div>;
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
    <div className='m-[10px]'>
      <p className="m-[10px] text-4xl">{'管理画面'}</p>
      <div className="flex flex-row">
        <button className="" disabled={modalMode !== null}>
          <Button text="新規追加" onClick={handleAddRow} arrow={false} />
        </button>
        <button className="" disabled={modalMode !== null}>
          <Button text="JSONでまとめて追加" onClick={handleAddJSONData} arrow={false} />
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
      <div>{status}</div>
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
      <h2 className="m-[10px]">{'登録済み生徒一覧'}</h2>
      <div className="flex items-center m-[10px]">
        <input type="text" placeholder="検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded mr-2" />
        <p className="text-sm text-gray-600 my-2">{'組と番号以外なら何でも検索できます。'}</p>
      </div>
      <p className="text-sm text-gray-600 my-2 m-[10px]">{'ヒント: Shiftキーを押しながら列名をクリックすると、複数の条件でソートできます。'}</p>
      <div className="table-root m-[10px] max-h-[60dvh] overflow-y-auto">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr>
              <th>
                <div className="flex flex-row">
                  <p>
                    {'学籍'}
                    <br />
                    {'番号'}
                  </p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('gakuseki', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('gakuseki')}
                  </button>
                </div>
              </th>
              <th>{'姓'}</th>
              <th>{'名'}</th>
              <th>
                <div className="flex flex-row">
                  <p>{'組'}</p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('class', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('class')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>{'番号'}</p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('number', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('number')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>{'一日目研修先'}</p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('day1id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1id')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>{'三日目研修先'}</p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('day3id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3id')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>
                    {'一日目'}
                    <br />
                    {'バス'}
                  </p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('day1bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day1bus')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>
                    {'三日目'}
                    <br />
                    {'バス'}
                  </p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('day3bus', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('day3bus')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>
                    {'TDH'}
                    <br />
                    {'号室'}
                  </p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('room_tokyo', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_tokyo')}
                  </button>
                </div>
              </th>
              <th>
                <div className="flex flex-row">
                  <p>
                    {'FPR'}
                    <br />
                    {'号室'}
                  </p>
                  <button className="ml-[0.5dvw]" onClick={(e) => handleSort('room_shizuoka', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('room_shizuoka')}
                  </button>
                </div>
              </th>
              <th>{'操作'}</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredStudents.map((s) => (
              <tr key={s.id}>
                <td>{s.gakuseki}</td>
                <td>{s.surname}</td>
                <td>{s.forename}</td>
                <td>{s.class}</td>
                <td>{s.number}</td>
                <td>{COURSES_DAY1.find((x) => x.key === s.day1id)?.name}</td>
                <td>{COURSES_DAY3.find((x) => x.key === s.day3id)?.name}</td>
                <td>{s.day1bus}</td>
                <td>{s.day3bus}</td>
                <td>{s.room_tokyo}</td>
                <td>{s.room_shizuoka}</td>
                <td>
                  <button className="mx-[5px] bg-gray-500 border-[1px] text-white p-[5px] cursor-pointer" onClick={() => handleEditClick(s)} disabled={modalMode !== null}>
                    {'編集'}
                  </button>
                  <button className="mx-[5px] bg-red-500 border-[1px] text-white p-[5px] cursor-pointer" onClick={() => handleDelete(s.id)} disabled={modalMode !== null}>
                    {'削除'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
