import OtanoshimiCard from '../components/OtanoshimiCard';
import { OTANOSHIMI_TEAMS } from '../data/otanoshimi';
import { v4 as uuid } from 'uuid';

const Otanoshimi = () => {
  return (
    <div className="flex flex-col items-center justify-center m-[10px]">
      <h1 className="text-3xl font-bold">{'お楽しみ会'}</h1>
      <p>{'修学旅行最後の夜、最高の思い出を。'}</p>

      <div className="mt-[3dvh]">
        <h2 className="text-xl text-center">{'出演団体一覧'}</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
          {OTANOSHIMI_TEAMS.map((x) => (
            <OtanoshimiCard key={uuid()} name={x} />
          ))}
        </div>
        <div className="mt-4">
          <p className="text-gray-600 text-sm">{'※出演順ではありません'}</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center mt-[3dvh]">
        <h2 className="text-xl text-center">{'タイムテーブル'}</h2>
        <section id="table">
          <table className="index-table">
            <thead>
              <tr>
                <th>{'時間'}</th>
                <th>{'内容'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{'17:00 - 18:00'}</td>
                <td>{'リハーサル'}</td>
              </tr>
              <tr>
                <td>{'18:00 - 19:00'}</td>
                <td>{'夕食'}</td>
              </tr>
              <tr>
                <td>{'19:00 - 21:30 (予定)'}</td>
                <td className="font-bold">{'お楽しみ会'}</td>
              </tr>
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
