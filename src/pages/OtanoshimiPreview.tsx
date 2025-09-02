import { useEffect, useState } from 'react';
import { SERVER_ENDPOINT } from '../App';
import type { OtanoshimiData } from '../data/otanoshimi';
import type { student } from '../data/students';

const OtanoshimiPreview = () => {
  const [teams, setTeams] = useState<OtanoshimiData[]>([]);
  const [allStudents, setAllStudents] = useState<student[]>([]);

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
      setTeams(teamsWithDefaults);
    } catch (error) {
      console.error('チームデータの取得に失敗:', error);
    }
  };

  const fetchAllStudents = async () => {
    try {
      const response = await fetch(`${SERVER_ENDPOINT}/api/students`);
      if (!response.ok) {
        throw new Error(`HTTPエラー! ステータス: ${response.status}`);
      }
      const students = await response.json();
      students.sort((a: student, b: student) => {
        if (a.gakuseki < b.gakuseki) {
          return -1;
        }
        if (a.gakuseki > b.gakuseki) {
          return 1;
        }
        return 0;
      });
      setAllStudents(students);
    } catch (error) {
      console.error('生徒データの取得に失敗:', error);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchAllStudents();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <section>
        {teams.map((x) => (
          <div className="m-2">
            <p>{x.name}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default OtanoshimiPreview;
