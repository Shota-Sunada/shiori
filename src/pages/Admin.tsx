import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { student } from '../data/students';
import type { IntRange } from 'type-fest';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import { getAuth } from 'firebase/auth';

const adminUsers = ["20210119"];

type StudentWithId = student & { id: string };

const initialForm: Omit<student, 'class' | 'number' > & { class: string; number: string;  } = {
  surname: '',
  forename: '',
  class: '',
  number: '',
  day1id: 'yrp_nifco',
  day3id: 'okutama',
  day1bus: '',
  day3bus: '',
  room_shizuoka: '',
  room_tokyo: '',
  tag: ''
};

const Admin: React.FC = () => {
  const [studentsList, setStudentsList] = useState<StudentWithId[]>([]);
  const [editRowId, setEditRowId] = useState<string | null>(null); // 編集中の行ID
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm); // 編集用フォーム
  const [isAdding, setIsAdding] = useState(false); // 新規追加中か
  const [status, setStatus] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Firestoreから生徒データを取得
  const fetchStudents = async () => {
    const snapshot = await getDocs(collection(db, 'students'));
    const list: StudentWithId[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as student), id: docSnap.id });
    });
    setStudentsList(list);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user && user.email) {
        const beforeAt = user.email.split('@')[0];
        setIsAdmin(adminUsers.includes(beforeAt));
      } else {
        setIsAdmin(false);
      }
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // 行内編集用
  const handleEditClick = (s: StudentWithId) => {
    setEditRowId(s.id);
    setEditRowForm({
      ...s,
      class: String(s.class),
      number: String(s.number),
    });
    setIsAdding(false);
    setStatus('');
  };

  const handleEditRowChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setEditRowForm({ ...editRowForm, [e.target.name]: e.target.value });
  };

  const handleEditRowSave = async () => {
    if (!editRowId) return;
    setStatus('更新中...');
    try {
      const data: student = {
        ...editRowForm,
        class: Number(editRowForm.class) as IntRange<1, 8>,
        number: Number(editRowForm.number) as IntRange<1, 42>,
      };
      await updateDoc(doc(db, 'students', editRowId), data);
      setStatus('生徒データを更新しました。');
      setEditRowId(null);
      fetchStudents();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  const handleEditRowCancel = () => {
    setEditRowId(null);
    setIsAdding(false);
    setEditRowForm(initialForm);
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
    setEditRowId('new');
    setEditRowForm(initialForm);
    setIsAdding(true);
    setStatus('');
  };

  const handleAddRowSave = async () => {
    setStatus('追加中...');
    try {
      const data: student = {
        ...editRowForm,
        class: Number(editRowForm.class) as IntRange<1, 8>,
        number: Number(editRowForm.number) as IntRange<1, 42>,
      };
      await addDoc(collection(db, 'students'), data);
      setStatus('生徒データを追加しました。');
      setEditRowId(null);
      setIsAdding(false);
      fetchStudents();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  // テーブルのカラム名
  const columns = [
    { key: 'surname', label: '姓' },
    { key: 'forename', label: '名' },
    { key: 'class', label: '組' },
    { key: 'number', label: '番号' },
    { key: 'day1id', label: '一日目研修先' },
    { key: 'day3id', label: '三日目研修先' },
    { key: 'day1bus', label: '一日目バス' },
    { key: 'day3bus', label: '三日目バス' },
    { key: 'room_tokyo', label: '東京ドームホテル 号室' },
    { key: 'room_shizuoka', label: '静岡 ホテル 号室' },
    { key: 'tag', label: '補足' }
  ];

  // day1id/day3idの選択肢
  const day1idOptions = [
    'yrp_nifco',
    'yrp_yamashin',
    'yrp_air',
    'yrp_vtech',
    'ntt_labo_i',
    'ntt_labo_b',
    'kayakku',
    'iaxa',
    'astro',
    'arda',
    'urth_jip',
    'micro',
    'air'
  ];
  const day3idOptions = ['okutama', 'yokosuka', 'hakone', 'kamakura', 'hakkeijima', 'yokohama'];

  if (!authChecked) {
    return <div>認証確認中...</div>;
  }
  if (!isAdmin) {
    return <div>権限がありません。</div>;
  }

  return (
    <div>
      <h1>生徒データ登録パネル</h1>
      <button onClick={handleAddRow} disabled={editRowId !== null}>
        新規追加
      </button>
      <div>{status}</div>
      <h2>登録済み生徒一覧</h2>
      <table border={1}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {/* 新規追加用の空白行 */}
          {isAdding && editRowId === 'new' && (
            <tr>
              <td>
                <input name="surname" value={editRowForm.surname} onChange={handleEditRowChange} required />
              </td>
              <td>
                <input name="forename" value={editRowForm.forename} onChange={handleEditRowChange} required />
              </td>
              <td>
                <input name="class" type="number" min={1} max={7} value={editRowForm.class} onChange={handleEditRowChange} required />
              </td>
              <td>
                <input name="number" type="number" min={1} max={41} value={editRowForm.number} onChange={handleEditRowChange} required />
              </td>
              <td>
                <select name="day1id" value={editRowForm.day1id} required onChange={handleEditRowChange}>
                  {day1idOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {COURSES_DAY1.find((x) => x.key == opt)?.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select name="day3id" value={editRowForm.day3id} required onChange={handleEditRowChange}>
                  {day3idOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {COURSES_DAY3.find((x) => x.key == opt)?.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <input name="day1bus" value={editRowForm.day1bus} required onChange={handleEditRowChange} />
              </td>
              <td>
                <input name="day3bus" value={editRowForm.day3bus} required onChange={handleEditRowChange} />
              </td>
              <td>
                <input name="room_tokyo" value={editRowForm.room_tokyo} required onChange={handleEditRowChange} />
              </td>
              <td>
                <input name="room_shizuoka" value={editRowForm.room_shizuoka} required onChange={handleEditRowChange} />
              </td>
              <td>
                <input name="tag" value={editRowForm.tag} required onChange={handleEditRowChange} />
              </td>
              <td>
                <button onClick={handleAddRowSave}>保存</button>
                <button onClick={handleEditRowCancel}>キャンセル</button>
              </td>
            </tr>
          )}
          {/* 既存データ */}
          {studentsList.map((s) =>
            editRowId === s.id ? (
              <tr key={s.id}>
                <td>
                  <input name="surname" value={editRowForm.surname} onChange={handleEditRowChange} required />
                </td>
                <td>
                  <input name="forename" value={editRowForm.forename} onChange={handleEditRowChange} required />
                </td>
                <td>
                  <input name="class" type="number" min={1} max={7} value={editRowForm.class} onChange={handleEditRowChange} required />
                </td>
                <td>
                  <input name="number" type="number" min={1} max={41} value={editRowForm.number} onChange={handleEditRowChange} required />
                </td>
                <td>
                  <select name="day1id" value={editRowForm.day1id} required onChange={handleEditRowChange}>
                    {day1idOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {COURSES_DAY1.find((x) => x.key == opt)?.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select name="day3id" value={editRowForm.day3id} required onChange={handleEditRowChange}>
                    {day3idOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {COURSES_DAY3.find((x) => x.key == opt)?.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input name="day1bus" value={editRowForm.day1bus} required onChange={handleEditRowChange} />
                </td>
                <td>
                  <input name="day3bus" value={editRowForm.day3bus} required onChange={handleEditRowChange} />
                </td>
                <td>
                  <input name="room_tokyo" value={editRowForm.room_tokyo} required onChange={handleEditRowChange} />
                </td>
                <td>
                  <input name="room_shizuoka" value={editRowForm.room_shizuoka} required onChange={handleEditRowChange} />
                </td>
                <td>
                  <input name="tag" value={editRowForm.tag} required onChange={handleEditRowChange} />
                </td>
                <td>
                  <button onClick={handleEditRowSave}>保存</button>
                  <button onClick={handleEditRowCancel}>キャンセル</button>
                </td>
              </tr>
            ) : (
              <tr key={s.id}>
                <td>{s.surname}</td>
                <td>{s.forename}</td>
                <td>{s.class}</td>
                <td>{s.number}</td>
                <td>{COURSES_DAY1.find((x) => x.key == s.day1id)?.name}</td>
                <td>{COURSES_DAY3.find((x) => x.key == s.day3id)?.name}</td>
                <td>{s.day1bus}</td>
                <td>{s.day3bus}</td>
                <td>{s.room_tokyo}</td>
                <td>{s.room_shizuoka}</td>
                <td>{s.tag}</td>
                <td>
                  <button onClick={() => handleEditClick(s)} disabled={editRowId !== null}>
                    編集
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={editRowId !== null}>
                    削除
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
