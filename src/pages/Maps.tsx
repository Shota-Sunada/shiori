import { useState } from 'react';
import MDButton, { BackToHome } from '../components/MDButton';
import { useAuth } from '../auth-context';

const Maps = () => {
  type MapId = 'tdh' | 'fpr' | 'hiroshima_sta' | 'metro' | undefined;

  const { user } = useAuth();
  const [id, setId] = useState<MapId>(undefined);

  const Image = (title: string, src: string, alt?: string) => {
    return (
      <div className="my-6 flex flex-col items-center w-full max-w-2xl bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <p className="text-lg md:text-2xl font-bold mb-2 text-gray-800">{title}</p>
        <div className="w-full flex justify-center">
          <img src={src} alt={alt} className="rounded-lg max-w-full h-auto border border-gray-300 shadow-sm" />
        </div>
      </div>
    );
  };

  switch (id) {
    case 'hiroshima_sta':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('広島駅集合場所', 'hiroshima_sta.png')}
          {Image('広島駅集合場所', 'hiroshima_sta2.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
        </div>
      );
    case 'metro':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('東京メトロ路線図', 'metro.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
        </div>
      );
    case 'tdh':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('TDH 食事会場 B1F「天空」席', 'tenku2.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
          {Image('TDH 食事会場 3F「スーパーダイニングリラッサ」席', 'rirassa.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
        </div>
      );
    case 'fpr':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('フジプレミアムリゾート 全体図', 'fpr.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
        </div>
      );
    case undefined:
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] py-8 px-2">
          <div className="mb-6 text-center">
            <p className="text-xl md:text-2xl font-bold text-blue-900 mb-2">閲覧したいマップを選択してください</p>
            <p className="text-sm text-gray-500">※ まだ作成途中です。m(._.)m</p>
          </div>
          <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
            <button
              className="bg-white border border-blue-300 hover:border-blue-500 text-blue-900 font-semibold rounded-xl shadow-md px-8 py-6 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-left"
              onClick={() => setId('hiroshima_sta')}>
              <span className="block">広島駅集合場所</span>
            </button>
            <button
              className="bg-white border border-blue-300 hover:border-blue-500 text-blue-900 font-semibold rounded-xl shadow-md px-8 py-6 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-left"
              onClick={() => setId('metro')}>
              <span className="block">地下鉄メトロ路線図</span>
            </button>
            <button
              className="bg-white border border-blue-300 hover:border-blue-500 text-blue-900 font-semibold rounded-xl shadow-md px-8 py-6 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-left"
              onClick={() => setId('tdh')}>
              <span className="block">東京ドームホテル</span>
            </button>
            <button
              className="bg-white border border-blue-300 hover:border-blue-500 text-blue-900 font-semibold rounded-xl shadow-md px-8 py-6 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-400 text-lg text-left"
              onClick={() => setId('fpr')}>
              <span className="block">フジプレミアムリゾート</span>
            </button>
          </div>
          <div className="mt-10">
            <BackToHome user={user} />
          </div>
        </div>
      );
  }
};

export default Maps;
