import { useEffect, useState } from 'react';
import type { OtanoshimiData } from '../data/otanoshimi';
import { SERVER_ENDPOINT } from '../App';
import OtanoshimiCard from '../components/OtanoshimiCard';

interface OtanoshimiDataWithSchedule extends OtanoshimiData {
  schedule: string;
}

const Otanoshimi = () => {
  const [teams, setTeams] = useState<OtanoshimiDataWithSchedule[]>([]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/otanoshimi`);
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
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <h1 className="text-3xl font-bold">{'お楽しみ会'}</h1>
      <p>{'修学旅行最後の夜、最高の思い出を。'}</p>

      <div className="mt-[3dvh]">
        <h2 className="text-xl text-center">{'出演団体一覧'}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {teams.map((x) => (
            <OtanoshimiCard name={x.name} key={x.appearance_order}></OtanoshimiCard>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-[3dvh]">
        <h2 className="text-xl text-center">{'当日のスケジュール'}</h2>
        <section id="table">
          <table className="index-table">
            <thead>
              <tr>
                <th>{'時間'}</th>
                <th>{'演目'}</th>
                <th>{'内容'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="text-center">{'17:00 - 18:00'}</td>
                <td colSpan={2} className="text-center">
                  {'お楽しみ会 リハーサル'}
                </td>
              </tr>
              <tr>
                <td className="text-center">{'18:00 - 19:00'}</td>
                <td colSpan={2} className="text-center">
                  {'～ 夕食 ～'}
                </td>
              </tr>
              <tr>
                <td className="text-center">{'19:00 開始予定'}</td>
                <td colSpan={2} className="font-bold text-center">
                  {'お楽しみ会 START'}
                </td>
              </tr>
              {teams.map((x) => (
                <tr key={x.appearance_order}>
                  <td className="text-center">{x.schedule}</td>
                  <td className="text-center">{x.enmoku}</td>
                  <td className="text-center" >{x.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <div className="mt-4">
          <p className="text-gray-600 text-sm">{'※当日の進行状況により、時間が変動する場合があります。'}</p>
          <p className="text-gray-600 text-sm">{'※リハーサルでは、各出演団体が最終確認を行うのみとし、演技は行いません。'}</p>
          <p className="text-gray-600 text-sm">{'※演技時間は、各団体あたり5~10分(最長)です。'}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-[20dvh]">
        <p>{'STAFF'}</p>
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
