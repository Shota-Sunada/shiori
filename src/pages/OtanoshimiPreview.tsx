import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SERVER_ENDPOINT } from '../App';
import type { OtanoshimiData } from '../data/otanoshimi';
import type { student } from '../data/students';
import Button from '../components/Button';
import { useAuth } from '../auth-context';

const OtanoshimiPreview = () => {
  const { order } = useParams<{ order: string }>();
  const [team, setTeam] = useState<OtanoshimiData | null>(null);
  const [allStudents, setAllStudents] = useState<student[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const navigate = useNavigate();

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

        const appearanceOrder = parseInt(order || '', 10);
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
            enmoku: currentTeam.enmoku || ''
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

  if (loading) {
    return (
      <div className="flex items-center justify-center m-[10px]">
        <p>{'読み込み中...'}</p>
        <Button text="戻る" arrow onClick={() => navigate('/otanoshimi')} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center m-[10px]">
        <p>{'指定された出演順のチームが見つかりません。'}</p>
        <Button text="戻る" arrow onClick={() => navigate('/otanoshimi')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <section className="m-2 p-4 border rounded-lg shadow-lg bg-white w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-4">{team.name}</h2>
        <p className="text-lg text-center mb-2">{team.enmoku || ''}</p>
        <div className="mt-4">
          <h3 className="font-semibold">{'リーダー'}</h3>
          <p>{getNameById(team.leader)}</p>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold">{'メンバー'}</h3>
          <ul className="list-disc list-inside">
            {team.members.map((memberId) => (
              <li key={memberId}>{getNameById(memberId)}</li>
            ))}
            {team.custom_performers && team.custom_performers.length > 0 && team.custom_performers.map((performer, index) => <li key={index}>{performer}</li>)}
          </ul>
        </div>
      </section>

      <Button text="戻る" arrow onClick={() => navigate('/otanoshimi')} />
    </div>
  );
};

export default OtanoshimiPreview;
