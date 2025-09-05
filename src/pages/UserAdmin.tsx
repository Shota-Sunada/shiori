import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';
import { useRequireAuth } from '../auth-context';
import '../styles/admin-table.css';
import { SERVER_ENDPOINT } from '../App';

interface User {
  id: number;
  is_admin: boolean;
  is_teacher: boolean;
  failed_login_attempts: number;
  is_banned: boolean;
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

const UserAdmin = () => {
  const { user, token, loading } = useRequireAuth();
  const [usersList, setUsersList] = useState<User[] | null>(null);
  const [editRowId, setEditRowId] = useState<number | null>(null);
  const [editRowForm, setEditRowForm] = useState<typeof initialForm>(initialForm);
  const [status, setStatus] = useState<string>('');
  const [modalMode, setModalMode] = useState<'add' | 'edit' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([{ key: 'id', direction: 'asc' }]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const data: User[] = await response.json();
      setUsersList(data);
    } catch (error) {
      console.error('ユーザーの取得に失敗:', error);
      setStatus('ユーザーデータの取得に失敗しました。');
    }
  },[token]);

  const handleUnban = async (id: number) => {
    if (!token) return;
    if (!window.confirm('このユーザーのBANを解除しますか？')) return;
    setStatus('BANを解除中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/users/${id}/unban`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      setStatus('ユーザーのBANを解除しました。');
      fetchUsers();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
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

  const sortedAndFilteredUsers = useMemo(() => {
    if (!usersList) {
      return [];
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    const filtered = usersList.filter((u) => String(u.id).includes(lowercasedQuery) || (u.is_admin && 'admin'.includes(lowercasedQuery)) || (u.is_teacher && 'teacher'.includes(lowercasedQuery)));
    return sortList(filtered, sortConfigs);
  }, [usersList, searchQuery, sortConfigs]);

  useEffect(() => {
    if (!loading && user) {
      fetchUsers();
    }
  }, [user, loading, token, fetchUsers]);

  const handleEditClick = (u: User) => {
    setEditRowId(u.id);
    setEditRowForm({
      id: String(u.id),
      password: '',
      is_admin: u.is_admin,
      is_teacher: u.is_teacher
    });
    setStatus('');
    setModalMode('edit');
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    if (!window.confirm('本当に削除しますか？')) return;
    setStatus('削除中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/users/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      setStatus('ユーザーを削除しました。');
      fetchUsers();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  const handleAddRow = () => {
    setModalMode('add');
    setEditRowForm(initialForm);
    setStatus('');
  };

  const handleAddJSONData = () => {
    inputRef.current?.click();
  };

  const handleJSONRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (!token) return;
        const data = e.target?.result as string;
        const usersToProcess = JSON.parse(data);

        setStatus('更新中...');
        try {
          const response = await fetch(`${SERVER_ENDPOINT}/api/users/bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ users: usersToProcess })
          });
          const result = await response.json();
          if (!response.ok && response.status !== 207) {
            throw new Error(result.message || `HTTPエラー! ステータス: ${response.status}`);
          }
          setStatus(result.message);
        } catch (e) {
          setStatus('エラーが発生しました: ' + (e as Error).message);
        }
        fetchUsers();
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleSave = async (formData: typeof initialForm) => {
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
        const response = await fetch(`${SERVER_ENDPOINT}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ id, password, is_admin, is_teacher })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTPエラー! ステータス: ${response.status}`);
        }
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

        const response = await fetch(`${SERVER_ENDPOINT}/api/users/${editRowId}`, {
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
        setStatus('ユーザーを更新しました。');
        setModalMode(null);
        setEditRowId(null);
        fetchUsers();
      } catch (e) {
        setStatus('エラーが発生しました: ' + (e as Error).message);
      }
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

  if (!usersList) {
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
              <tr key={u.id} className={`${u.is_banned ? 'bg-red-200' : 'bg-white'}`}>
                <td className="bg-white">{u.id}</td>
                <td className="bg-white">
                  <input type="checkbox" checked={u.is_admin} readOnly className="mx-auto block" />
                </td>
                <td className="bg-white">
                  <input type="checkbox" checked={u.is_teacher} readOnly className="mx-auto block" />
                </td>
                <td className="bg-white">{u.failed_login_attempts}</td>
                <td className="bg-white">
                  <input type="checkbox" checked={u.is_banned} readOnly className="mx-auto block" />
                </td>
                <td className="bg-white sticky-col">
                  <div className="flex flex-row items-center justify-center">
                    {u.is_banned && (
                        <button className="p-1 cursor-pointer mx-1" onClick={() => handleUnban(u.id)} disabled={modalMode !== null} title="BAN解除">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 hover:text-green-800" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                    <button className="p-1 cursor-pointer mx-1" onClick={() => handleEditClick(u)} disabled={modalMode !== null} title="編集">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 hover:text-gray-800" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
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
        {modalMode !== null && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
              <h2 className="text-2xl font-bold mb-4">{modalMode === 'add' ? 'ユーザー追加' : 'ユーザー編集'}</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(editRowForm);
                }}>
                <div className="mb-4">
                  <label htmlFor="id" className="block text-gray-700 text-sm font-bold mb-2">
                    {'ユーザーID'}
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
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required={modalMode === 'add'}
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer text-gray-500" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <AiFillEyeInvisible size={24} /> : <AiFillEye size={24} />}
                    </span>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    <input type="checkbox" checked={editRowForm.is_admin} onChange={(e) => setEditRowForm({ ...editRowForm, is_admin: e.target.checked })} className="mr-2 leading-tight" />
                    {'管理者'}
                  </label>
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    <input type="checkbox" checked={editRowForm.is_teacher} onChange={(e) => setEditRowForm({ ...editRowForm, is_teacher: e.target.checked })} className="mr-2 leading-tight" />
                    {'教員'}
                  </label>
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
        )}
        <div className="flex items-center my-[10px]">
          <input type="text" placeholder="検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="border p-2 rounded mr-2 max-w-[50dvw]" />
          <p className="text-sm text-gray-600 my-2">{'ユーザーIDで検索できます。'}</p>
        </div>
      </div>
    </div>
  );
};

export default UserAdmin;