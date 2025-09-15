import { useState, useEffect, useMemo, useRef, useCallback, memo, type ChangeEvent, type KeyboardEvent, type FC } from 'react';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { useRequireAuth } from '../../auth-context';
import '../../styles/admin-table.css';
import '../../styles/table.css';
import { userApi } from '../../helpers/domainApi';
import CenterMessage from '../../components/CenterMessage';
import type { User } from '../../interface/models';

interface MemoizedRowProps {
  u: User;
  handleUnban: (id: number) => void;
  handleDelete: (id: number) => void;
  modalMode: 'add' | 'edit' | null;
  renderCellContent: (u: User, field: keyof User) => React.ReactNode;
  handleCellDoubleClick: (u: User, field: keyof User) => void;
}

interface UserModalProps {
  modalMode: 'add' | 'edit' | null;
  editRowForm: typeof initialForm;
  handleSave: (formData: typeof initialForm) => void;
  setModalMode: (mode: 'add' | 'edit' | null) => void;
  setEditRowForm: (form: typeof initialForm) => void;
}

type SortKey = keyof User;
type SortDirection = 'asc' | 'desc';
type SortConfig = {
  key: SortKey;
  direction: SortDirection;
};

const sortList = (list: User[], configs: SortConfig[]): User[] => {
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
      if (aValue < bValue) {
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
  password: '',
  is_admin: false,
  is_teacher: false
};

const MemoizedRow: FC<MemoizedRowProps> = memo(({ u, handleUnban, handleDelete, modalMode, renderCellContent, handleCellDoubleClick }) => {
  return (
    <tr className={`${u.is_banned ? 'bg-red-200' : 'bg-white'}`}>
      <td className="bg-white" onDoubleClick={() => handleCellDoubleClick(u, 'id')}>
        {renderCellContent(u, 'id')}
      </td>
      <td className={u.is_admin ? 'bg-green-200' : 'bg-red-200'} onDoubleClick={() => handleCellDoubleClick(u, 'is_admin')}>
        {renderCellContent(u, 'is_admin')}
      </td>
      <td className={u.is_teacher ? 'bg-green-200' : 'bg-red-200'} onDoubleClick={() => handleCellDoubleClick(u, 'is_teacher')}>
        {renderCellContent(u, 'is_teacher')}
      </td>
      <td className="bg-white">{u.failed_login_attempts}</td>
      <td className={u.is_banned ? 'bg-red-200' : 'bg-green-200'} onDoubleClick={() => handleCellDoubleClick(u, 'is_banned')}>
        {renderCellContent(u, 'is_banned')}
      </td>
      <td className="bg-white sticky-col">
        <div className="flex flex-row items-center justify-center">
          {u.is_banned ? (
            <button className="p-1 cursor-pointer mx-1" onClick={() => handleUnban(u.id)} disabled={modalMode !== null} title="BAN解除">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 hover:text-green-800" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </button>
          ) : (
            <></>
          )}
          <button className="p-1 cursor-pointer mx-1" onClick={() => handleDelete(u.id)} disabled={modalMode !== null} title="削除">
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

const UserModal: FC<UserModalProps> = memo(({ modalMode, editRowForm, handleSave, setModalMode, setEditRowForm }) => {
  const [showPassword, setShowPassword] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (modalMode && firstFieldRef.current) firstFieldRef.current.focus();
  }, [modalMode]);

  if (!modalMode) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 modal-overlay" role="dialog" aria-modal="true">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">{modalMode === 'add' ? 'ユーザー追加' : 'ユーザー編集'}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(editRowForm);
          }}
          className="space-y-4">
          <div>
            <label htmlFor="id" className="block text-gray-700 text-sm font-bold mb-2">
              {'ユーザーID'}
            </label>
            <input
              ref={firstFieldRef}
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
          <div>
            <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
              {'パスワード '}
              {modalMode === 'edit' && '(変更する場合のみ入力)'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={editRowForm.password}
                onChange={(e) => setEditRowForm({ ...editRowForm, password: e.target.value })}
                className="shadow appearance-none border rounded w-full py-2 px-3 pr-10 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required={modalMode === 'add'}
              />
              <button
                type="button"
                aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示'}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-500"
                onClick={() => setShowPassword((p) => !p)}>
                {showPassword ? <AiFillEyeInvisible size={24} /> : <AiFillEye size={24} />}
              </button>
            </div>
          </div>
          <div className="flex items-center">
            <input id="is_admin" type="checkbox" checked={editRowForm.is_admin} onChange={(e) => setEditRowForm({ ...editRowForm, is_admin: e.target.checked })} className="mr-2" />
            <label htmlFor="is_admin" className="text-sm font-bold">
              {'管理者'}
            </label>
          </div>
          <div className="flex items-center">
            <input id="is_teacher" type="checkbox" checked={editRowForm.is_teacher} onChange={(e) => setEditRowForm({ ...editRowForm, is_teacher: e.target.checked })} className="mr-2" />
            <label htmlFor="is_teacher" className="text-sm font-bold">
              {'教員'}
            </label>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded disabled:opacity-60">
              {modalMode === 'add' ? '追加' : '更新'}
            </button>
            <button type="button" onClick={() => setModalMode(null)} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">
              {'キャンセル'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});

const UserAdmin = () => {
  const { user, token, loading } = useRequireAuth();
  const [usersList, setUsersList] = useState<User[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm);
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [editingCell, setEditingCell] = useState<{ userId: number; field: keyof User } | null>(null);
  const [editingValue, setEditingValue] = useState<string | number | boolean>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ key: 'id', direction: 'asc' }]);

  // ユーザー一覧取得 (appFetch + キャッシュ)
  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const data = await userApi.list();
      setUsersList(data as User[]);
    } catch (error) {
      console.error('ユーザーの取得に失敗:', error);
      setStatus('ユーザーデータの取得に失敗しました。');
    }
  }, [token]);

  const handleUnban = useCallback(
    async (id: number) => {
      if (!token) return;
      if (!window.confirm('このユーザーのBANを解除しますか？')) return;
      setStatus('BANを解除中...');
      try {
        await userApi.unban(id);
        setStatus('ユーザーのBANを解除しました。');
        fetchUsers();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    },
    [token, fetchUsers]
  );

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

  const sortedAndFilteredUsers = useMemo(() => {
    if (!usersList) return [];
    const q = debouncedSearchQuery.trim().toLowerCase();
    if (!q) return sortList(usersList, sortConfigs);
    const filtered = usersList.filter((u) => {
      if (String(u.id).includes(q)) return true;
      if (q === 'admin' && u.is_admin) return true;
      if (q === 'teacher' && u.is_teacher) return true;
      if (q === 'banned' && u.is_banned) return true;
      return false;
    });
    return sortList(filtered, sortConfigs);
  }, [usersList, debouncedSearchQuery, sortConfigs]);

  useEffect(() => {
    if (!loading && user) {
      fetchUsers();
    }
  }, [user, loading, token, fetchUsers]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (!token) return;
      if (!window.confirm('本当に削除しますか？')) return;
      setStatus('削除中...');
      try {
        await userApi.remove(id);
        setStatus('ユーザーを削除しました。');
        fetchUsers();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
    },
    [token, fetchUsers]
  );

  const handleAddRow = useCallback(() => {
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  }, []);

  const handleAddJSONData = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleJSONRead = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          if (!token) return;
          try {
            const data = e.target?.result as string;
            const usersToProcess = JSON.parse(data);
            setStatus('更新中...');
            const result = await userApi.bulk(usersToProcess);
            setStatus(result.message);
            fetchUsers();
          } catch (error) {
            setStatus('エラーが発生しました: ' + (error as Error).message);
          }
        };
        reader.readAsText(e.target.files[0]);
      }
    },
    [token, fetchUsers]
  );

  const handleSave = useCallback(
    async (formData: typeof initialForm) => {
      if (!token) return;
      const id = Number(formData.id);
      const { password, is_admin, is_teacher } = formData;

      if (modalMode === 'add') {
        if (isNaN(id) || !password) {
          setStatus('IDとパスワードを正しく入力してください。');
          return;
        }
        setStatus('追加中...');
        try {
          await userApi.add({ id, password, is_admin, is_teacher });
          setStatus('ユーザーを追加しました。');
          setModalMode(null);
          fetchUsers();
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
      } else if (modalMode === 'edit') {
        if (editRowId === null) return;
        setStatus('更新中...');
        try {
          const body: { password?: string; is_admin: boolean; is_teacher: boolean } = {
            is_admin,
            is_teacher
          };
          if (password) {
            body.password = password;
          }

          await userApi.update(editRowId, body);
          setStatus('ユーザーを更新しました。');
          setModalMode(null);
          setEditRowId(null);
          fetchUsers();
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
      }
    },
    [token, modalMode, editRowId, fetchUsers]
  );

  const handleCellDoubleClick = useCallback(
    (u: User, field: keyof User) => {
      if (modalMode !== null) return;
      setEditingCell({ userId: u.id, field });
      setEditingValue(u[field]);
    },
    [modalMode]
  );

  const handleCellChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      setEditingValue(e.target.checked);
    } else {
      const { value } = e.target;
      setEditingValue(value === 'true' ? true : value === 'false' ? false : value);
    }
  }, []);

  const handleCellEditSave = useCallback(async () => {
    if (!editingCell) return;

    const { userId, field } = editingCell;

    const originalUser = usersList?.find((u) => u.id === userId);
    if (originalUser && originalUser[field] === editingValue) {
      setEditingCell(null);
      return;
    }

    let valueToSave: string | number | boolean = editingValue;
    if (field === 'id') {
      valueToSave = Number(editingValue);
      if (isNaN(valueToSave)) {
        setStatus('無効な数値です。');
        setEditingCell(null);
        return;
      }
    }

    setStatus('更新中...');
    try {
      await userApi.update(userId, { [field]: valueToSave } as Partial<Pick<User, 'is_admin' | 'is_teacher' | 'is_banned'>>);

      setUsersList((prevList) => {
        if (!prevList) return null;
        return prevList.map((user) => {
          if (user.id === userId) {
            return { ...user, [field]: valueToSave };
          }
          return user;
        });
      });
      setStatus('更新しました。');
      setEditingCell(null);
    } catch (error) {
      setStatus('エラーが発生しました: ' + (error as Error).message);
      setEditingCell(null);
    }
  }, [editingCell, editingValue, usersList]);

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
    (u: User, field: keyof User) => {
      if (editingCell?.userId === u.id && editingCell?.field === field) {
        if (field === 'is_admin' || field === 'is_teacher' || field === 'is_banned') {
          return (
            <input type="checkbox" checked={editingValue as boolean} onChange={(e) => handleCellChange(e)} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="w-full" />
          );
        }
        return <input type="text" value={editingValue as string} onChange={handleCellChange} onBlur={handleCellEditSave} onKeyDown={handleCellKeyDown} autoFocus className="w-full" />;
      }

      if (field === 'is_admin' || field === 'is_teacher' || field === 'is_banned') {
        return u[field] ? 'true' : 'false';
      }
      return u[field];
    },
    [editingCell, editingValue, handleCellChange, handleCellEditSave, handleCellKeyDown]
  );

  if (loading) return <CenterMessage>認証中...</CenterMessage>;

  if (!user) {
    return null;
  }

  if (!usersList) return <CenterMessage>読込中...</CenterMessage>;

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
        <table className="table-base table-rounded table-shadow">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'ユーザーID'}</span>
                  <button onClick={(e) => handleSort('id', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('id')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'管理者'}</span>
                  <button onClick={(e) => handleSort('is_admin', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('is_admin')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'教員'}</span>
                  <button onClick={(e) => handleSort('is_teacher', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('is_teacher')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'ログイン失敗回数'}</span>
                  <button onClick={(e) => handleSort('failed_login_attempts', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('failed_login_attempts')}
                  </button>
                </div>
              </th>
              <th className="w-24">
                <div className="flex flex-col items-center justify-center">
                  <span>{'BAN'}</span>
                  <button onClick={(e) => handleSort('is_banned', e.shiftKey)} disabled={modalMode !== null}>
                    {getSortIndicator('is_banned')}
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
            {sortedAndFilteredUsers.map((u) => (
              <MemoizedRow
                key={u.id}
                u={u}
                handleUnban={handleUnban}
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
        <p>{'ユーザーIDは学籍番号と同じです。'}</p>
      </div>
      <div>
        <div className="flex flex-row">
          <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddRow}>
            {'新規追加'}
          </button>
          <button className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white" disabled={modalMode !== null} onClick={handleAddJSONData}>
            {'JSONでまとめて追加'}
          </button>
          <button
            className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white"
            disabled={modalMode !== null}
            onClick={async () => {
              setStatus('リロード中...');
              await fetchUsers();
              setStatus('リロード完了');
            }}>
            {'リロード'}
          </button>
        </div>
        <input className="m-[10px]" ref={inputRef} type="file" name="json" id="json" hidden accept=".json" onChange={handleJSONRead} />
        <div className="my-[10px]">
          <p>
            {'ステータス: '}
            {status}
          </p>
        </div>
        <UserModal modalMode={modalMode} editRowForm={editRowForm} handleSave={handleSave} setModalMode={setModalMode} setEditRowForm={setEditRowForm} />
        <div className="flex items-center my-[10px]">
          <input
            type="text"
            placeholder="検索 (ID / admin / teacher / banned)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border p-2 rounded mr-2 max-w-[50dvw]"
          />
          <p className="text-sm text-gray-600 my-2">{'ID / admin / teacher / banned で絞り込み可'}</p>
        </div>
      </div>
    </div>
  );
};

export default UserAdmin;
