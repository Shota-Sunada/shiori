import { useState, useEffect, type ChangeEvent, type DragEvent } from 'react';
import { SERVER_ENDPOINT } from '../App';
import '../styles/admin-table.css';

interface OtanoshimiData {
  name: string;
  leader: number;
  members: number[];
  time: number;
  appearance_order: number;
}

const OtanoshimiAdmin = () => {
  const [teams, setTeams] = useState<OtanoshimiData[]>([]);
  const [status, setStatus] = useState<string>('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const dragItem = document.createElement('div');

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`);
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const data: OtanoshimiData[] = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('チームデータの取得に失敗:', error);
      setStatus('チームデータの取得中にエラーが発生しました。');
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement>,
    index: number,
    field: keyof OtanoshimiData
  ) => {
    const newTeams = [...teams];
    const value = e.target.value;

    if (field === 'leader' || field === 'time' || field === 'appearance_order') {
      newTeams[index] = { ...newTeams[index], [field]: Number(value) };
    } else if (field === 'members') {
      newTeams[index] = { ...newTeams[index], [field]: value.split(',').map(Number) };
    } else {
      newTeams[index] = { ...newTeams[index], [field]: value };
    }
    setTeams(newTeams);
  };

  const handleSave = async () => {
    setStatus('保存中...');
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(teams)
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      setStatus('保存しました。');
      setEditingIndex(null);
      fetchTeams();
    } catch (e) {
      setStatus('エラーが発生しました: ' + (e as Error).message);
    }
  };

  const handleAddNewTeam = () => {
    const newTeam: OtanoshimiData = {
      name: '新しいチーム',
      leader: 0,
      members: [],
      time: 0,
      appearance_order: teams.length + 1
    };
    setTeams([...teams, newTeam]);
    setEditingIndex(teams.length);
  };

  const handleDelete = (index: number) => {
    if (!window.confirm('本当にこのチームを削除しますか？')) return;
    const newTeams = teams.filter((_, i) => i !== index);
    // Update appearance_order
    const updatedTeams = newTeams.map((team, i) => ({
      ...team,
      appearance_order: i + 1
    }));
    setTeams(updatedTeams);
  };

  const onDragStart = (e: DragEvent<HTMLTableRowElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setDragImage(dragItem, 0, 0);
  };

  const onDrop = (e: DragEvent<HTMLTableRowElement>, toIndex: number) => {
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    const newTeams = [...teams];
    const [removed] = newTeams.splice(fromIndex, 1);
    newTeams.splice(toIndex, 0, removed);

    // Update appearance_order
    const updatedTeams = newTeams.map((team, index) => ({
      ...team,
      appearance_order: index + 1
    }));

    setTeams(updatedTeams);
  };

  const onDragOver = (e: DragEvent<HTMLTableSectionElement>) => {
    e.preventDefault();
  };

  return (
    <div className="p-[5px] flex flex-col">
      <div className="table-root overflow-y-auto flex flex-grow max-h-[80dvh] max-w-[90dvw] mx-auto rounded-xl">
        <table border={1} className="w-full">
          <thead className="sticky top-0 bg-white z-10">
            <tr>
              <th className="w-12">{'順番'}</th>
              <th className="w-48">{'チーム名'}</th>
              <th className="w-24">{'リーダー (学籍番号)'}</th>
              <th className="w-96">{'メンバー (学籍番号, カンマ区切り)'}</th>
              <th className="w-24">{'時間 (分)'}</th>
              <th className="w-32">{'操作'}</th>
            </tr>
          </thead>
          <tbody onDragOver={onDragOver}>
            {teams.map((team, index) => (
              <tr key={index} draggable onDragStart={(e) => onDragStart(e, index)} onDrop={(e) => onDrop(e, index)}>
                <td className="bg-white text-center">{team.appearance_order}</td>
                {editingIndex === index ? (
                  <>
                    <td className="bg-white">
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleInputChange(e, index, 'name')}
                        className="w-full"
                      />
                    </td>
                    <td className="bg-white">
                      <input
                        type="number"
                        value={team.leader}
                        onChange={(e) => handleInputChange(e, index, 'leader')}
                        className="w-full"
                      />
                    </td>
                    <td className="bg-white">
                      <input
                        type="text"
                        value={team.members.join(',')}
                        onChange={(e) => handleInputChange(e, index, 'members')}
                        className="w-full"
                      />
                    </td>
                    <td className="bg-white">
                      <input
                        type="number"
                        value={team.time}
                        onChange={(e) => handleInputChange(e, index, 'time')}
                        className="w-full"
                      />
                    </td>
                  </>
                ) : (
                  <>
                    <td className="bg-white">{team.name}</td>
                    <td className="bg-white">{team.leader}</td>
                    <td className="bg-white">{team.members.join(', ')}</td>
                    <td className="bg-white">{team.time}</td>
                  </>
                )}
                <td className="bg-white">
                  <div className="flex flex-row items-center justify-center">
                    {editingIndex === index ? (
                      <button
                        className="p-1 cursor-pointer mx-1 text-green-600 hover:text-green-800"
                        onClick={() => setEditingIndex(null)}
                        title="完了"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        className="p-1 cursor-pointer mx-1 text-gray-600 hover:text-gray-800"
                        onClick={() => setEditingIndex(index)}
                        title="編集"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                    )}
                    <button
                      className="p-1 cursor-pointer mx-1 text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(index)}
                      title="削除"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
      <div className="flex items-center my-[10px]">
        <button onClick={handleSave} className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white">
          {'全体を保存'}
        </button>
        <button onClick={handleAddNewTeam} className="border-2 border-black p-2 rounded-xl mr-2 cursor-pointer bg-white">
          {'新規追加'}
        </button>
        <p>
          {'ステータス: '}
          {status}
        </p>
      </div>
    </div>
  );
};

export default OtanoshimiAdmin;
