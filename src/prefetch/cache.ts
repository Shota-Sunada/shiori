// シンプルなメモリキャッシュ (ページ遷移前プレフェッチ用)
export type PrefetchKey =
  | 'otanoshimiTeams'
  | 'rollCalls'
  | 'studentIndexData'
  | 'yoteiStudent'
  | 'yoteiTeacher'
  | 'mapsPage'
  | 'goodsPage'
  | 'day2List'
  | 'boatsList'
  | 'shinkansenDay1'
  | 'shinkansenDay4'
  | 'busListDay1'
  | 'busListDay3'
  | 'busListDay4';

type CacheStore = Partial<Record<PrefetchKey, unknown>>;

// 単純なオブジェクトで十分 (SSR していない前提)
const store: CacheStore = {};

export const setPrefetchData = <T>(key: PrefetchKey, value: T) => {
  store[key] = value as unknown;
};

export const getPrefetchData = <T>(key: PrefetchKey): T | undefined => {
  return store[key] as T | undefined;
};

export const consumePrefetchData = <T>(key: PrefetchKey): T | undefined => {
  const val = getPrefetchData<T>(key);
  if (val !== undefined) {
    delete store[key];
  }
  return val;
};

export const hasPrefetchData = (key: PrefetchKey) => getPrefetchData(key) !== undefined;
