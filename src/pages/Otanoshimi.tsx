import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { OtanoshimiData } from '../data/otanoshimi';
import { SERVER_ENDPOINT } from '../App';
import OtanoshimiCard from '../components/OtanoshimiCard';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import Button from '../components/Button';

interface OtanoshimiDataWithSchedule extends OtanoshimiData {
  schedule: string;
}

const OtanoshimiPreviewModal = ({ order, max, onClose, onNavigate }: { order: number; max: number; onClose: () => void; onNavigate: (newOrder: number) => void }) => {
  const [team, setTeam] = useState<OtanoshimiData | null>(null);
  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const teamsResponse = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (!teamsResponse.ok) {
          throw new Error(`HTTPエラー! ステータス: ${teamsResponse.status}`);
        }
        const teamsData: OtanoshimiData[] = await teamsResponse.json();

        const appearanceOrder = order || 10;
        const currentTeam = teamsData.find((t) => t.appearance_order === appearanceOrder);

        if (currentTeam) {
          const studentsResponse = await fetch(`${SERVER_ENDPOINT}/api/students`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (!studentsResponse.ok) {
            throw new Error(`HTTPエラー! ステータス: ${studentsResponse.status}`);
          }
          const studentsData: student[] = await studentsResponse.json();
          setAllStudents(studentsData);

          setTeam({
            ...currentTeam,
            custom_performers: currentTeam.custom_performers || [],
            enmoku: currentTeam.enmoku || '',
            comment: currentTeam.comment || '',
            supervisor: currentTeam.supervisor || []
          });
        } else {
          setTeam(null);
        }
      } catch (error) {
        console.error('データの取得に失敗:', error);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    };

    if (order) {
      fetchAllData();
    }
  }, [order, token]);

  const getNameById = (gakuseki: number) => {
    const student = allStudents.find((x) => x.gakuseki === gakuseki);
    return student ? `${student.surname} ${student.forename} (5-${student.class})` : '[ERROR]';
  };

  return (
    <div className="fixed inset-0 flex justify-center items-center z-50 modal-overlay">
      <div className="bg-white p-4 rounded-lg shadow-lg w-full m-4 max-w-[95dvw] h-[90dvh]">
        <div className="flex flex-col items-center justify-center m-[10px]">
          <section className="m-2 p-4 border rounded-lg shadow-lg bg-white w-full max-w-md h-full min-h-[70dvh] max-h-[70dvh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-center mb-4">{loading ? '読込中' : !team ? '指定された出演順のチームが見つかりません。' : `${order}.「${team.name}」`}</h2>
            <p className="text-lg text-center mb-2">
              {'演目: '}
              {loading ? '読込中' : !team ? '演目不詳' : team.enmoku}
            </p>
            <div className="mt-4">
              <h3 className="font-semibold">{'リーダー'}</h3>
              <p>{loading ? '読込中' : !team ? '不詳' : getNameById(team.leader)}</p>
            </div>
            {team?.comment ? (
              <div className="mt-4">
                <h3 className="font-semibold">{'コメント'}</h3>
                <p style={{ whiteSpace: 'pre-wrap' }}>{team.comment}</p>
              </div>
            ) : (
              <></>
            )}
            <div className="mt-4">
              <h3 className="font-semibold">{'メンバー'}</h3>
              <ul className="list-disc list-inside grid grid-cols-2 gap-1">
                {loading ? '読込中' : !team ? '不詳' : team.members.map((memberId) => <li key={memberId}>{getNameById(memberId)}</li>)}
                {loading ? <></> : !team ? <></> : team.custom_performers.length > 0 ? team.custom_performers.map((performer, index) => (performer ? <li key={index}>{performer}</li> : <></>)) : <></>}
              </ul>
            </div>
            {team?.supervisor && team.supervisor.length > 0 ? (
              <div className="mt-4">
                <h3 className="font-semibold">{'監修'}</h3>
                <ul className="list-disc list-inside">{team.supervisor.map((sup, index) => (sup ? <li key={index}>{sup}</li> : <></>))}</ul>
              </div>
            ) : (
              <></>
            )}
          </section>

          <section id="buttons" className="flex flex-col items-center justify-center">
            <div className="flex flex-row">
              <Button
                text="前へ"
                arrowLeft
                onClick={() => {
                  if (order === 1) {
                    onNavigate(max);
                  } else {
                    onNavigate(order - 1);
                  }
                }}
                width={'mobiry-button-150'}
              />
              <Button
                text="次へ"
                arrowRight
                onClick={() => {
                  if (order === max) {
                    onNavigate(1);
                  } else {
                    onNavigate(order + 1);
                  }
                }}
                width={'mobiry-button-150'}
              />
            </div>
            <Button text="閉じる" onClick={onClose} color="purple" />
          </section>
        </div>
      </div>
    </div>
  );
};

const Otanoshimi = () => {
  const { token } = useAuth();
  const [teams, setTeams] = useState<OtanoshimiDataWithSchedule[] | undefined>(undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const previewOrder = searchParams.get('preview');

  useEffect(() => {
    if (previewOrder) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [previewOrder]);

  const fetchTeams = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const data: OtanoshimiData[] = await response.json();
      const teamsWithDefaults = data.map((team) => ({
        ...team,
        custom_performers: team.custom_performers || [],
        enmoku: team.enmoku || ''
      }));
      teamsWithDefaults.sort((a, b) => a.appearance_order - b.appearance_order);

      const scheduleStartTime = new Date();
      scheduleStartTime.setHours(19, 0, 0, 0);
      let currentTime = scheduleStartTime.getTime();

      const formatTime = (date: Date) => `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      const teamsWithSchedule = teamsWithDefaults.map((team) => {
        const startTime = new Date(currentTime);
        const endTime = new Date(currentTime + team.time * 60000);
        const schedule = `${formatTime(startTime)} - ${formatTime(endTime)}`;
        currentTime = endTime.getTime() + 60000;
        return { ...team, schedule };
      });

      setTeams(teamsWithSchedule);
    } catch (error) {
      console.error('チームデータの取得に失敗:', error);
    }
  }, [token]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleCloseModal = () => {
    setSearchParams({});
  };

  const handleNavigate = (newOrder: number) => {
    navigate(`/otanoshimi?preview=${newOrder}`);
  };

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      {previewOrder ? <OtanoshimiPreviewModal order={parseInt(previewOrder || '')} max={teams?.length || 0} onClose={handleCloseModal} onNavigate={handleNavigate} /> : <></>}

      <div className="m-2 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">{'お楽しみ会'}</h1>
        <p>{'修学旅行最後の夜、最高の思い出を。'}</p>
      </div>

      <div className="m-5">
        <h2 className="text-xl text-center font-bold">{'出演団体一覧'}</h2>
        <p className="text-center">{'クリックすると、各団体の詳細を閲覧できます。'}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {teams ? teams.map((x) => <OtanoshimiCard name={x.name} index={x.appearance_order} key={x.appearance_order}></OtanoshimiCard>) : <p>{'読込中...'}</p>}
        </div>
      </div>

      <Button text="ホームに戻る" arrowLeft link="/index"></Button>

      <div className="flex flex-col items-center justify-center m-5">
        <h2 className="text-xl text-center font-bold">{'当日のスケジュール'}</h2>
        <section id="table" className="mt-2">
          <div className=''>
            <table className="index-table">
              <thead className="bg-white">
                <tr>
                  <th>{'時間'}</th>
                  <th colSpan={2}>{'内容'}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-100">
                  <td className="text-center">{'17:00 - 18:00'}</td>
                  <td colSpan={2} className="text-center">
                    {'お楽しみ会 リハーサル'}
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="text-center">{'18:00 - 19:00'}</td>
                  <td colSpan={2} className="text-center">
                    {'～ 夕食 ～'}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="font-bold text-center bg-yellow-200">
                    {'お楽しみ会 START'}
                  </td>
                </tr>
              </tbody>
              <thead className="bg-white">
                <tr>
                  <th>{'時間'}</th>
                  <th>{'団体名'}</th>
                  <th>{'演目'}</th>
                </tr>
              </thead>
              <tbody>
                {teams ? (
                  teams.map((x, i) => (
                    <tr key={x.appearance_order} className={`bg-${i % 2 === 0 ? 'gray-100' : 'white'}`}>
                      <td className="text-center">{x.schedule}</td>
                      <td className="text-center">{x.name}</td>
                      <td className="text-center">{x.enmoku}</td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-gray-100">
                    <td className="text-center" colSpan={3}>
                      {'読込中'}
                    </td>
                  </tr>
                )}
                <tr className={teams ? (teams.length % 2 === 0 ? 'bg-gray-100' : 'bg-white') : ''}>
                  <td className="text-center">{'21:30 (厳守)'}</td>
                  <td className="text-center font-bold" colSpan={2}>
                    {'終了 + 解散'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <div className="mt-4">
          <p className="text-gray-600 text-sm">{'※当日の進行状況により、時間が変動する場合があります。'}</p>
          <p className="text-gray-600 text-sm">{'※リハーサルでは、各出演団体が最終確認を行うのみとし、演技は行いません。'}</p>
          {/* <p className="text-gray-600 text-sm">{'※演技時間は、各団体あたり5~10分(最長)です。'}</p> */}
        </div>
      </div>

      <Button text="ホームに戻る" arrowLeft link="/index"></Button>

      <div className="flex flex-col items-center justify-center mt-8">
        <p className="text-xl font-bold">{'STAFF'}</p>
        <div className="flex flex-row">
          <p className="m-2">{'町 一誠'}</p>
        </div>
        <div className="flex flex-row">
          <p className="m-2">{'砂田 翔太'}</p>
          <p className="m-2">{'野間 大生樹'}</p>
          <p className="m-2">{'藤岡 大颯'}</p>
          <p className="m-2">{'藤村 英輝'}</p>
        </div>
      </div>
    </div>
  );
};

export default Otanoshimi;
