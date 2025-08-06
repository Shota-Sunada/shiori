import React, { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import type { student } from '../data/students';
import { COURSES_DAY1, COURSES_DAY3 } from '../data/courses';
import { getAuth } from 'firebase/auth';
import '../styles/admin-table.css';
import StudentModal from '../components/StudentModal';

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

  const inputRef = useRef<HTMLInputElement>(null);

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

        obj.map(async (x) => {
          const colRef = collection(db, 'students');
          const q = query(colRef, where('forename', '==', x.forename));
          const snapshot = await getDocs(q);
          const list: StudentWithId[] = [];
          snapshot.forEach((x) => {
            list.push({ ...(x.data() as student), id: x.id });
          });

          if (list.length > 0) {
            setStatus('更新中...');
            try {
              await updateDoc(doc(db, 'students', list[0].id), x);
              setStatus('生徒データを更新しました。');
              setModalMode(null);
              setEditRowId(null);
              fetchStudents();
            } catch (e) {
              setStatus('エラーが発生しました: ' + (e as Error).message);
            }
          } else {
            setStatus('追加中...');
            try {
              await addDoc(collection(db, 'students'), x);
              setStatus('生徒データを追加しました。');
              setModalMode(null);
              fetchStudents();
            } catch (e) {
              setStatus('エラーが発生しました: ' + (e as Error).message);
            }
          }
        });
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  // テーブルのカラム名
  const columns = [
    { key: 'gakuseki', label: '学籍番号' },
    { key: 'surname', label: '姓' },
    { key: 'forename', label: '名' },
    { key: 'class', label: '組' },
    { key: 'number', label: '番号' },
    { key: 'day1id', label: '一日目研修先' },
    { key: 'day3id', label: '三日目研修先' },
    { key: 'day1bus', label: '一日目バス' },
    { key: 'day3bus', label: '三日目バス' },
    { key: 'room_tokyo', label: '東京ドームホテル 号室' },
    { key: 'room_shizuoka', label: '静岡 ホテル 号室' }
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
    return <div>{'認証確認中...'}</div>;
  }
  if (!isAdmin) {
    return <div>{'権限がありません。'}</div>;
  }

  if (!studentsList) {
    return <div>{'読込中...'}</div>;
  }

  return (
    <div>
      <h1>{'生徒データ登録パネル'}</h1>
      <button onClick={handleAddRow} disabled={modalMode !== null}>
        {'新規追加'}
      </button>
      <button onClick={handleAddJSONData} disabled={modalMode !== null}>
        {'JSONから追加'}
      </button>
      <input
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
      <h2>{'登録済み生徒一覧'}</h2>
      <div className="table-root">
        <table border={1}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              <th>{'操作'}</th>
            </tr>
          </thead>
          <tbody>
            {/* 既存データ */}
            {studentsList.map((s) => (
              <tr key={s.id}>
                <td>{s.gakuseki}</td>
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
                <td>
                  <button onClick={() => handleEditClick(s)} disabled={modalMode !== null}>
                    {'編集'}
                  </button>
                  <button onClick={() => handleDelete(s.id)} disabled={modalMode !== null}>
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
