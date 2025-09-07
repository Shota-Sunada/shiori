import { useCallback, useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { OtanoshimiData } from '../data/otanoshimi';
import { SERVER_ENDPOINT } from '../App';
import OtanoshimiCard from '../components/OtanoshimiCard';
import { useAuth } from '../auth-context';
import type { student } from '../data/students';
import MDButton from '../components/MDButton';

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
      if (!order) return;
      setLoading(true);
      try {
        const [teamsRes, studentsRes] = await Promise.all([
          fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${SERVER_ENDPOINT}/api/students`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        if (!teamsRes.ok) throw new Error(`HTTPエラー: ${teamsRes.status}`);
        if (!studentsRes.ok) throw new Error(`HTTPエラー: ${studentsRes.status}`);
        const teamsData: OtanoshimiData[] = await teamsRes.json();
        const studentsData: student[] = await studentsRes.json();
        setAllStudents(studentsData);
        const current = teamsData.find((t) => t.appearance_order === order) || null;
        setTeam(
          current ? { ...current, custom_performers: current.custom_performers || [], enmoku: current.enmoku || '', comment: current.comment || '', supervisor: current.supervisor || [] } : null
        );
      } catch (e) {
        console.error('データの取得に失敗:', e);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
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
            <h2 className="text-2xl font-bold text-center mb-4">{loading ? '読込中...' : !team ? '指定された出演順のチームが見つかりません。' : `${order}.「${team.name}」`}</h2>
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
                {loading ? '読込中...' : !team ? '不詳' : team.members.map((memberId) => <li key={memberId}>{getNameById(memberId)}</li>)}
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
              <MDButton
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
              <MDButton
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
            <MDButton text="閉じる" onClick={onClose} color="purple" />
          </section>
        </div>
      </div>
    </div>
  );
};

const Otanoshimi = () => {
  const { token } = useAuth();
  const [teams, setTeams] = useState<OtanoshimiDataWithSchedule[] | null>(null);
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
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTPエラー: ${response.status}`);
      const data: OtanoshimiData[] = await response.json();
      const base = data.map((team) => ({ ...team, custom_performers: team.custom_performers || [], enmoku: team.enmoku || '' })).sort((a, b) => a.appearance_order - b.appearance_order);
      const scheduleStart = new Date();
      scheduleStart.setHours(19, 0, 0, 0);
      let cursor = scheduleStart.getTime();
      const format = (d: Date) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      const withSchedule = base.map((t) => {
        const start = new Date(cursor);
        const end = new Date(cursor + t.time * 60000);
        const schedule = `${format(start)} - ${format(end)}`;
        cursor = end.getTime() + 60000; // +1min buffer
        return { ...t, schedule };
      });
      setTeams(withSchedule);
    } catch (e) {
      console.error('チームデータの取得に失敗:', e);
      setTeams([]);
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

  const splitTime = (range: string): { start: string; end: string | null } => {
    if (!range) return { start: '', end: null };
    // Normalize separators
    const cleaned = range.replace(/（/g, '(').replace(/）/g, ')');
    if (cleaned.includes('-')) {
      const [s, e] = cleaned.split('-').map((x) => x.trim());
      // guard for cases like '21:30 (厳守)'
      if (/^[0-2]?\d:\d{2}/.test(e)) {
        return { start: s, end: e };
      }
      return { start: s, end: e || null };
    }
    return { start: cleaned, end: null };
  };

  const renderTimeCell = (range: string) => {
    const { start, end } = splitTime(range);
    return (
      <td className="text-center time-col">
        <div className="time-range">
          <span>{start}</span>
          {end ? <span>{end}</span> : null}
        </div>
      </td>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      {previewOrder && teams ? <OtanoshimiPreviewModal order={parseInt(previewOrder || '')} max={teams.length || 0} onClose={handleCloseModal} onNavigate={handleNavigate} /> : <></>}

      <div className="m-2 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold">{'お楽しみ会'}</h1>
        <p>{'修学旅行最後の夜、最高の思い出を。'}</p>
      </div>

      <div className="m-5">
        <h2 className="text-xl text-center font-bold">{'出演団体一覧'}</h2>
        <p className="text-center">{'クリックすると、各団体の詳細を閲覧できます。'}</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
          {!teams ? (
            <p>{'読込中...'}</p>
          ) : teams.length === 0 ? (
            <p>{'データがありません。'}</p>
          ) : (
            teams.map((x) => <OtanoshimiCard name={x.name} index={x.appearance_order} key={x.appearance_order} />)
          )}
        </div>
      </div>
      <MDButton text="ホームに戻る" arrowLeft link="/index" />

      <div className="flex flex-col items-center justify-center m-5">
        <h2 className="text-xl text-center font-bold">{'当日のスケジュール'}</h2>
        <section id="table" className="mt-2 space-y-6 schedule-table-wrapper">
          {/* 第1部: リハーサル & 夕食 */}
          <table className="index-table schedule-table modern-table table-rounded table-shadow">
            <thead className="bg-white">
              <tr>
                <th className="time-col">{'時間'}</th>
                <th>{'内容'}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-100">
                {renderTimeCell('17:00 - 18:00')}
                <td className="text-center">{'お楽しみ会 リハーサル'}</td>
              </tr>
              <tr className="bg-white">
                {renderTimeCell('18:00 - 19:00')}
                <td className="text-center">{'～ 夕食 ～'}</td>
              </tr>
              <tr>
                <td colSpan={2} className="font-bold text-center schedule-divider">
                  {'お楽しみ会 START'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 第2部: 出演団体 */}
          <table className="index-table schedule-table modern-table table-rounded table-shadow">
            <thead className="bg-white">
              <tr>
                <th className="time-col">{'時間'}</th>
                <th>{'団体名'}</th>
                <th>{'演目'}</th>
              </tr>
            </thead>
            <tbody>
              {!teams ? (
                <tr className="bg-gray-100">
                  <td className="text-center" colSpan={3}>
                    {'読込中...'}
                  </td>
                </tr>
              ) : teams.length === 0 ? (
                <tr className="bg-gray-100">
                  <td className="text-center" colSpan={3}>
                    {'データ無し'}
                  </td>
                </tr>
              ) : (
                teams.map((x, i) => {
                  const [start, end] = x.schedule.split('-').map((s) => s.trim());
                  return (
                    <tr key={x.appearance_order} className={i % 2 === 0 ? 'bg-gray-100' : 'bg-white'}>
                      <td className="text-center time-col">
                        <div className="time-range">
                          <span>{start}</span>
                          <span>{end}</span>
                        </div>
                      </td>
                      <td className="text-center col-team">{x.name}</td>
                      <td className="text-center col-enmoku">{x.enmoku}</td>
                    </tr>
                  );
                })
              )}
              <tr className={teams ? (teams.length % 2 === 0 ? 'bg-gray-100' : 'bg-white') : 'bg-white'}>
                {renderTimeCell('21:30 (厳守)')}
                <td className="text-center font-bold col-team col-enmoku schedule-divider" colSpan={2}>
                  {'終了 + 解散'}
                </td>
              </tr>
            </tbody>
          </table>
        </section>
        <div className="mt-4">
          <p className="text-gray-600 text-sm">{'※当日の進行状況により、時間が変動する場合があります。'}</p>
          <p className="text-gray-600 text-sm">{'※リハーサルでは、各出演団体が最終確認を行うのみとし、演技は行いません。'}</p>
          {/* <p className="text-gray-600 text-sm">{'※演技時間は、各団体あたり5~10分(最長)です。'}</p> */}
        </div>
      </div>

      <MDButton text="ホームに戻る" arrowLeft link="/index" />

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
