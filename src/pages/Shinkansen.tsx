import LoadingPage from '../components/LoadingPage';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth-context';
import { studentApi, teacherApi, type StudentDTO, type TeacherDTO } from '../helpers/domainApi';
import Message from '../components/Message';
import MDButton, { BackToHome } from '../components/MDButton';
import { isOffline } from '../helpers/isOffline';

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

  const getStudentDoor = (isDay4?: boolean) => {
    if (student) {
      if (isDay4) {
        switch (student.shinkansen_day4_car_number) {
          case 13:
            return '①13号車東京側ドア';
          case 14:
            if (student.class === 2) {
              return '②14号車博多側ドア';
            } else {
              return '③14号車東京側ドア';
            }
          case 15:
            if (
              student.class === 3 ||
              student.shinkansen_day4_seat === '6A' ||
              student.shinkansen_day4_seat === '6B' ||
              student.shinkansen_day4_seat === '6C' ||
              student.shinkansen_day4_seat === '6D' ||
              student.shinkansen_day4_seat === '6E' ||
              student.shinkansen_day4_seat === '7A' ||
              student.shinkansen_day4_seat === '7B' ||
              student.shinkansen_day4_seat === '7C' ||
              student.shinkansen_day4_seat === '7D' ||
              student.shinkansen_day4_seat === '7E' ||
              student.shinkansen_day4_seat === '8A' ||
              student.shinkansen_day4_seat === '8B' ||
              student.shinkansen_day4_seat === '8C' ||
              student.shinkansen_day4_seat === '8D' ||
              student.shinkansen_day4_seat === '8E'
            ) {
              return '④15号車博多側ドア';
            } else {
              return '⑤15号車東京側ドア';
            }
          case 16:
            if (student.class === 6) {
              return '⑥16号車博多側ドア';
            } else {
              return '⑦16号車東京側ドア';
            }
        }
      } else {
        switch (student.shinkansen_day1_car_number) {
          case 13:
            return '①13号車東京側ドア';
          case 14:
            if (student.class === 3 || student.class === 4) {
              return '②14号車博多側ドア';
            } else {
              return '③14号車東京側ドア';
            }
          case 15:
            if (student.class === 6) {
              return '④15号車博多側ドア';
            } else {
              return '⑤15号車東京側ドア';
            }
          case 16:
            if (student.class === 3 || student.class === 2) {
              return '⑥16号車博多側ドア';
            } else {
              return '⑦16号車東京側ドア';
            }
        }
      }
    }
  };

  const getTeacherDoor = (isDay4?: boolean) => {
    if (teacher) {
      if (isDay4) {
        switch (teacher.shinkansen_day4_car_number) {
          case 13:
            return '①13号車東京側ドア';
          case 14:
            return '②14号車博多側ドア';
          case 15:
            return '⑤15号車東京側ドア';
          case 16:
            return '⑦16号車東京側ドア';
        }
      } else {
        if (teacher.shinkansen_day1_car_number === 13) {
          return '①13号車東京側ドア';
        } else if (teacher.shinkansen_day1_car_number === 14) {
          if (['1A', '1B', '1C', '1D', '1E'].includes(teacher.shinkansen_day1_seat)) {
            return '②14号車博多側ドア';
          } else {
            return '③14号車東京側ドア';
          }
        } else if (teacher.shinkansen_day1_car_number === 15) {
          if (teacher.shinkansen_day1_seat === '1D' || teacher.shinkansen_day1_seat === '1E') {
            return '④15号車博多側ドア';
          } else {
            return '⑤15号車東京側ドア';
          }
        } else {
          return '⑦16号車東京側ドア';
        }
      }
    }
  };

  const [offline, setOffline] = useState(isOffline());
  useEffect(() => {
    const update = () => setOffline(isOffline());
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (loading) {
    return <LoadingPage message="読み込み中..." />;
  }

  if (!student && !teacher) {
    return <Message type="alert">データが取得できませんでした。</Message>;
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">新幹線座席情報</h1>
      <div className="flex gap-2 mb-6">
        <button className={`px-4 py-2 rounded-t ${tab === 'day1' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('day1')}>
          ゆき（1日目）
        </button>
        <button className={`px-4 py-2 rounded-t ${tab === 'day4' ? 'bg-blue-600 text-white font-bold' : 'bg-gray-100 text-gray-600'}`} onClick={() => setTab('day4')}>
          かえり（4日目）
        </button>
      </div>

      {tab === 'day1' && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">1日目（ゆき）のぞみ84号 東京行</h2>
            <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
              <div>
                <span className="font-semibold">乗車位置：</span>
                <span>広島駅新幹線ホーム13番線</span>
              </div>
              <div>
                <span className="font-semibold">乗降ドア：</span>
                <span>{user?.is_teacher ? getTeacherDoor() : getStudentDoor()}</span>
              </div>
              <div className="grid grid-cols-2">
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
              </div>
              {(student && day1TokyoGetOff.includes(student.day1id)) || (teacher && day1TokyoGetOff.includes(teacher.day1id)) ? (
                <>
                  <div>
                    <span className="font-semibold">降車駅：</span>
                    <span>東京駅で降車</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-center">東京駅では、進行方向右側の扉が開きます。</span>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <span className="font-semibold">降車駅：</span>
                    <span>新横浜駅で降車</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="font-semibold text-center">新横浜駅では、進行方向左側の扉が開きます。</span>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 text-center">
                <span>広島駅</span>
                <span></span>
                <span>7:57発</span>
                <span>新横浜駅</span>
                <span>11:34着</span>
                <span>11:35発</span>
                <span>東京駅</span>
                <span>11:57着</span>
                <span></span>
              </div>
            </div>
          </div>
          <Message type="important">
            <div className="ml-2">
              <li>離れた場所との席の入れ替えはお控えください。</li>
              <li>一般の方のご迷惑にならないように心がけましょう。</li>
              <li>新幹線車内は Free Wi-Fi が使用できます。</li>
              <li>周囲の座席は、下の「新幹線座席表」から確認できます。</li>
              <li>走行位置は、下の「新幹線 個別列車案内 (JR東海)」で詳しく確認できます。</li>
              <li>新横浜駅の停車時間は、1分です。降車する人はあらかじめ準備をしておきましょう。</li>
              <li>乗降時は、混雑回避のため上の「乗降ドア」に記載された場所で乗り降りしましょう。</li>
              <li>運行状況により、到着時刻や発着ホームが変更になる場合があります。</li>
            </div>
          </Message>
        </>
      )}
      {tab === 'day4' && (
        <>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">4日目（かえり）のぞみ77号 広島行</h2>
            <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
              <div>
                <span className="font-semibold">乗車位置：</span>
                <span>新横浜駅新幹線ホーム4番線</span>
              </div>
              <div>
                <span className="font-semibold">乗降ドア：</span>
                <span>{user?.is_teacher ? getTeacherDoor(true) : getStudentDoor(true)}</span>
              </div>
              <div className="grid grid-cols-2">
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
              </div>
              <div>
                <span className="font-semibold">降車駅：</span>
                <span>広島駅または福山駅で降車</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="font-semibold text-center">広島駅･福山駅では、進行方向左側の扉が開きます。</span>
              </div>
              <div className="grid grid-cols-3 text-center">
                <span>新横浜駅</span>
                <span>16:06着</span>
                <span>16:07発</span>
                <span>福山駅</span>
                <span>19:22着</span>
                <span>19:23発</span>
                <span>広島駅</span>
                <span>19:46着</span>
                <span></span>
              </div>
            </div>
          </div>
          <Message type="important">
            <div className="ml-2">
              <li>しおりでは席が指定されていますが、同じ班内であれば座席の入れ替えが自由に可能です。</li>
              <li>離れた場所との席の入れ替えはお控えください。</li>
              <li>一般の方のご迷惑にならないように心がけましょう。</li>
              <li>新幹線車内は Free Wi-Fi が使用できます。</li>
              <li>周囲の座席は、下の「新幹線座席表」から確認できます。</li>
              <li>走行位置は、下の「新幹線 個別列車案内 (JR東海)」で詳しく確認できます。</li>
              <li>新横浜駅、福山駅の停車時間は、1分です。あらかじめ準備をしておきましょう。</li>
              <li>乗降時は、混雑回避のため上の「乗降ドア」に記載された場所で乗り降りしましょう。</li>
              <li>運行状況により、到着時刻や発着ホームが変更になる場合があります。</li>
            </div>
          </Message>
        </>
      )}
      <div className="flex flex-col items-center justify-center m-2">
        <p>新幹線 個別列車案内</p>
        <MDButton
          disabled={offline}
          text={tab === 'day1' ? 'のぞみ84号 (ゆき)' : tab === 'day4' ? 'のぞみ77号 (かえり)' : '不明'}
          color="orange"
          onClick={() => {
            if (tab === 'day1') {
              window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=84', '_blank', 'noreferrer');
            } else if (tab === 'day4') {
              window.open('https://traininfo.jr-central.co.jp/shinkansen/sp/ja/ti07.html?traintype=6&train=77', '_blank', 'noreferrer');
            }
          }}
        />
        {offline ? <p className="text-red-500">個別列車案内を開くには、インターネットに接続する必要があります。</p> : <p>↑JR東海のページが開きます。</p>}
        <MDButton text="新幹線座席表" arrowRight link={tab === 'day4' ? '/shinkansen/floor?direction=hiroshima' : '/shinkansen/floor'} />
        <BackToHome user={user} />
      </div>
    </div>
  );
};

export default Shinkansen;
