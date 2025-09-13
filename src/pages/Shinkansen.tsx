import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { studentApi, teacherApi, type StudentDTO, type TeacherDTO } from '../helpers/domainApi';
import Message from '../components/Message';
import MDButton from '../components/MDButton';

const Shinkansen = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [student, setStudent] = useState<StudentDTO | null>(null);
  const [teacher, setTeacher] = useState<TeacherDTO | null>(null);
  const [loading, setLoading] = useState(true);
  // クエリから初期タブを決定
  const getInitialTab = () => {
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'day4') return 'day4';
    return 'day1';
  };
  const [tab, setTab] = useState<'day1' | 'day4'>(getInitialTab());

  useEffect(() => {
    // クエリが変わったらタブも切り替え
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    if (t === 'day4') setTab('day4');
    else setTab('day1');
  }, [location.search]);

  const day1TokyoGetOff = ['astro', 'arda', 'urth_jip', 'micro', 'air'];

  useEffect(() => {
    const fetch = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (user.is_teacher) {
        try {
          const t = await teacherApi.self(user.userId);
          setTeacher(t);
        } catch {
          setTeacher(null);
        }
      } else {
        try {
          const s = await studentApi.getById(user.userId);
          setStudent(s);
        } catch {
          setStudent(null);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return <div className="p-6">読み込み中...</div>;
  }

  if (!student && !teacher) {
    return <Message type="alert">データが取得できませんでした。</Message>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">新幹線座席情報</h1>
      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded-t ${tab === 'day1' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('day1')}>
          行き（1日目）
        </button>
        <button className={`px-4 py-2 rounded-t ${tab === 'day4' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('day4')}>
          帰り（4日目）
        </button>
      </div>

      {tab === 'day1' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">1日目（行き）のぞみ84号 東京行</h2>
          <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
            <div>
              <span className="font-semibold">号車：</span>
              {(student && <span>{student.shinkansen_day1_car_number}号車</span>) || (teacher && <span>{teacher.shinkansen_day1_car_number}号車</span>) || (
                <span className="text-gray-400">未割当</span>
              )}
            </div>
            <div>
              <span className="font-semibold">座席：</span>
              {(student && <span>{student.shinkansen_day1_seat}</span>) || (teacher && <span>{teacher.shinkansen_day1_seat}</span>) || <span className="text-gray-400">未割当</span>}
            </div>
            <div>
              <span className="font-semibold">下車駅：</span>
              {(student && (day1TokyoGetOff.includes(student.day1id) ? <span>東京駅で下車</span> : <span>新横浜駅で下車</span>)) ||
                (teacher && (day1TokyoGetOff.includes(teacher.day1id) ? <span>東京駅で下車</span> : <span>新横浜駅で下車</span>)) || <span className="text-gray-400">未割当</span>}
            </div>
          </div>
        </div>
      )}
      {tab === 'day4' && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">4日目（帰り）のぞみ77号 広島行</h2>
          <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
            <div>
              <span className="font-semibold">号車：</span>
              {(student && <span>{student.shinkansen_day4_car_number}号車</span>) || (teacher && <span>{teacher.shinkansen_day4_car_number}号車</span>) || (
                <span className="text-gray-400">未割当</span>
              )}
            </div>
            <div>
              <span className="font-semibold">座席：</span>
              {(student && <span>{student.shinkansen_day4_seat}</span>) || (teacher && <span>{teacher.shinkansen_day4_seat}</span>) || <span className="text-gray-400">未割当</span>}
            </div>
            <div>
              <span className="font-semibold">下車駅：</span>
              <span>広島駅で下車</span>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col items-center justify-center">
        <p>新幹線 個別列車案内</p>
        <MDButton
          text={tab === 'day1' ? 'のぞみ84号 (行き)' : tab === 'day4' ? 'のぞみ77号 (帰り)' : '不明'}
          arrowLeft={tab === 'day4'}
          arrowRight={tab === 'day1'}
          color="white"
          onClick={() => {
            if (tab === 'day1') {
              window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=84', '_blank', 'noreferrer');
            } else if (tab === 'day4') {
              window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=77', '_blank', 'noreferrer');
            }
          }}
        />
        <p>↑JR東海のページが開きます。</p>
      </div>
      <Message type="info">新幹線の座席情報は変更になる場合があります。最新情報は担任または引率教員からの案内もご確認ください。</Message>
    </div>
  );
};

export default Shinkansen;
