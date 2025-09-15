import { useState } from 'react';
import MDButton, { BackToHome } from '../components/MDButton';
import { useAuth } from '../auth-context';

const Maps = () => {
  type MapId = 'tdh' | 'fpr' | 'hiroshima_sta' | undefined;

  const { user } = useAuth();
  const [id, setId] = useState<MapId>(undefined);

  const Image = (title: string, src: string, alt?: string) => {
    return (
      <div className="m-2">
        <p className="text-2xl font-semibold">{title}</p>
        <img src={src} alt={alt} />
      </div>
    );
  };

  switch (id) {
    case 'hiroshima_sta':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('広島駅集合場所', 'hiroshima_sta.png')}
          <MDButton text="戻る" color="white" arrowLeft onClick={() => setId(undefined)} />
        </div>
      );
    case 'tdh':
      return (
        <div className="flex flex-col items-center justify-center text-center">
          {Image('TDH 食事会場 B1F「天空」席', 'tenku.png')}
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
        <div className="flex flex-col items-center justify-center text-center">
          <p>{'閲覧したいマップを選択してください'}</p>
          <p>{"まだ作ってる途中だから雑です。m(._.)m"}</p>
          <p
            className="bg-blue-400 px-20 py-10 text-white m-3 cursor-pointer"
            onClick={() => {
              setId('hiroshima_sta');
            }}>
            {'広島駅'}
          </p>
          <p
            className="bg-blue-400 px-20 py-10 text-white m-3 cursor-pointer"
            onClick={() => {
              setId('tdh');
            }}>
            {'東京ドームホテル'}
          </p>
          <p
            className="bg-blue-400 px-20 py-10 text-white m-3 cursor-pointer"
            onClick={() => {
              setId('fpr');
            }}>
            {'フジプレミアムリゾート'}
          </p>
          <BackToHome user={user} />
        </div>
      );
  }
};

export default Maps;
