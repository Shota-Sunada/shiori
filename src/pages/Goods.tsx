import LoadingPage from '../components/LoadingPage';
import { GOODS_DATA, GOODS_JAXA, GOODS_OKUTAMA, GOODS_DOKUTSU, GOODS_KANU } from '../data/goods';
import { useAuth } from '../auth-context';
import { studentApi, type StudentDTO } from '../helpers/domainApi';
import { DAY4_DATA } from '../data/courses';
import { useEffect, useState } from 'react';
import MDButton, { BackToHome } from '../components/MDButton';

const Goods = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      if (user && !user.is_teacher) {
        const s = await studentApi.getById(user.userId);
        setStudent(s);
      }
      setLoading(false);
    };
    fetch();
  }, [user]);

  // コース該当判定
  let jaxa = false,
    okutama = false,
    doukutsu = false,
    kanuu = false;
  let day4key = null;
  if (student) {
    jaxa = student.day1id === 'jaxa';
    okutama = student.day3id === 'okutama';
    day4key = DAY4_DATA[(student.class ?? 0) - 1];
    doukutsu = day4key === 'doukutsu';
    kanuu = day4key === 'kanuu';
  }

  if (loading) {
    return <LoadingPage message="読み込み中..." />;
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-2xl font-bold m-2">持ち物一覧</h1>
      <BackToHome user={user} />
      <MDButton text="持ち物チェッカー" arrowRight link="/goods-check" />

      <Section title="共通の持ち物" items={GOODS_DATA} />
      {(user?.is_teacher || jaxa) && <Section title="JAXA用持ち物" items={GOODS_JAXA} />}
      {(user?.is_teacher || okutama) && <Section title="奥多摩ラフティング用持ち物" items={GOODS_OKUTAMA} />}
      {(user?.is_teacher || doukutsu) && <Section title="洞窟コース用持ち物" items={GOODS_DOKUTSU} />}
      {(user?.is_teacher || kanuu) && <Section title="カヌーコース用持ち物" items={GOODS_KANU} />}

      <MDButton text="持ち物チェッカー" arrowRight link="/goods-check" />
      <BackToHome user={user} />
    </div>
  );
};

const Section = ({ title, items }: { title: string; items: typeof GOODS_DATA }) => (
  <div className="m-2 w-[80dvw] max-w-[500px]">
    <h2 className="text-lg font-semibold mb-2">{title}</h2>
    <div className="bg-white rounded shadow divide-y">
      {items.map((item) => (
        <div key={item.name} className="flex flex-row justify-start items-center gap-4 p-4">
          <div className="flex flex-col min-w-[3.5rem] justify-center items-center text-2xl select-none overflow-hidden" aria-hidden>
            {item.icon.map((ic, i) => (
              <span key={i} className="inline-block mb-1 last:mb-0">
                {ic}
              </span>
            ))}
          </div>
          <div>
            <div className="font-semibold">{item.name}</div>
            {item.note && (
              <ul className="text-sm text-gray-600 list-disc ml-5 mt-1">
                {item.note.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default Goods;
