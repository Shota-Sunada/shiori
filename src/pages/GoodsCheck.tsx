import { useEffect, useMemo, useState } from 'react';
import { GOODS_DATA, GOODS_JAXA, GOODS_OKUTAMA, GOODS_DOKUTSU, GOODS_KANU, type GOODS } from '../data/goods';
import  { BackToHome } from '../components/MDButton';
import { useAuth } from '../auth-context';
import { studentApi, type StudentDTO } from '../helpers/domainApi';
import { DAY4_DATA } from '../data/courses';

// 保存用キー
const STORAGE_KEY = 'goods-check-progress-v1';
const LAST_RESULT_KEY = 'goods-check-last-result-v1';

type ItemStatus = 'pending' | 'checked' | 'skipped';

interface PersistedState {
  currentIndex: number;
  statuses: ItemStatus[];
}

interface LastResultState {
  savedAt: string; // ISO string
  statuses: ItemStatus[];
}

const loadPersisted = (length: number): PersistedState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!Array.isArray(parsed.statuses)) return null;
    if (typeof parsed.currentIndex !== 'number') return null;
    if (parsed.statuses.length !== length) return null; // データ数が変わったら破棄
    return parsed;
  } catch {
    return null;
  }
};

type Mode = 'main' | 'jaxa' | 'okutama' | 'doukutsu' | 'kanuu';

const GoodsCheck = () => {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('main');
  const [goods, setGoods] = useState<GOODS[]>(() => GOODS_DATA);
  const [courseGoods, setCourseGoods] = useState<{ [key in Mode]?: GOODS[] }>({});
  // 各コース該当フラグ
  const [hasJaxa, setHasJaxa] = useState(false);
  const [hasOkutama, setHasOkutama] = useState(false);
  const total = goods.length;
  const [statuses, setStatuses] = useState<ItemStatus[]>(() => Array(total).fill('pending'));
  const [activeTab, setActiveTab] = useState<'flow' | 'list'>('flow');
  const [lastResult, setLastResult] = useState<LastResultState | null>(() => {
    try {
      const raw = localStorage.getItem(LAST_RESULT_KEY);
      return raw ? (JSON.parse(raw) as LastResultState) : null;
    } catch {
      return null;
    }
  });
  const { user } = useAuth();

  // コース判定用
  const [day4key, setDay4key] = useState<string | null>(null);

  const findNextPendingIndex = (arr: ItemStatus[], from: number) => {
    const n = arr.length;
    for (let offset = 1; offset <= n; offset++) {
      const i = (from + offset) % n;
      if (arr[i] === 'pending') return i;
    }
    return -1;
  };

  // ユーザーのコースに応じて持ち物を分離
  useEffect(() => {
    let isMounted = true;
    const setupGoods = async () => {
      try {
        if (user && !user.is_teacher) {
          const s: StudentDTO = await studentApi.getById(user.userId);
          let mainList: GOODS[] = [...GOODS_DATA];
          // 1日目: JAXA
          const isJaxa = s.day1id === 'jaxa';
          if (isJaxa) mainList = [...mainList, ...GOODS_JAXA];
          // 3日目: 奥多摩ラフティング
          const isOkutama = s.day3id === 'okutama';
          if (isOkutama) mainList = [...mainList, ...GOODS_OKUTAMA];
          // 4日目: クラス -> コースキーに変換
          const d4key = DAY4_DATA[(s.class ?? 0) - 1];
          setDay4key(d4key);
          const course: { [key in Mode]?: GOODS[] } = {};
          if (isJaxa) course['jaxa'] = GOODS_JAXA;
          if (isOkutama) course['okutama'] = GOODS_OKUTAMA;
          if (d4key === 'doukutsu') course['doukutsu'] = GOODS_DOKUTSU;
          if (d4key === 'kanuu') course['kanuu'] = GOODS_KANU;
          if (isMounted) {
            setGoods(mainList);
            setCourseGoods(course);
            setHasJaxa(isJaxa);
            setHasOkutama(isOkutama);
          }
        } else {
          if (isMounted) {
            setGoods(GOODS_DATA);
            setCourseGoods({});
            setDay4key(null);
            setHasJaxa(false);
            setHasOkutama(false);
          }
        }
      } catch {
        if (isMounted) {
          setGoods(GOODS_DATA);
          setCourseGoods({});
          setDay4key(null);
          setHasJaxa(false);
          setHasOkutama(false);
        }
      }
    };
    setupGoods();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // goodsの長さに合わせて保存済み進捗を復元
  useEffect(() => {
    const targetGoods = mode === 'main' ? goods : courseGoods[mode] || [];
    const persisted = loadPersisted(targetGoods.length);
    if (persisted) {
      setStatuses(persisted.statuses);
      const idx = findNextPendingIndex(persisted.statuses, -1);
      setCurrentIndex(idx === -1 ? 0 : idx);
      setStarted(true);
    } else {
      setStatuses(Array(targetGoods.length).fill('pending'));
      setCurrentIndex(0);
    }
  }, [goods.length, mode, courseGoods, goods]);

  // 変更があれば保存
  useEffect(() => {
    if (!started) return;
    const data: PersistedState = { currentIndex, statuses };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [started, currentIndex, statuses]);

  // 完了時に前回の記録として保存（isFinished 定義後に配置）

  const targetGoods = mode === 'main' ? goods : courseGoods[mode] || [];
  const totalTarget = targetGoods.length;
  const doneCount = useMemo(() => statuses.filter((s) => s === 'checked').length, [statuses]);
  const pendingCount = useMemo(() => statuses.filter((s) => s === 'pending').length, [statuses]);
  const isFinished = useMemo(() => statuses.every((s) => s !== 'pending'), [statuses]);

  // 完了時に前回の記録として保存
  useEffect(() => {
    if (!started) return;
    if (!isFinished) return;
    const result: LastResultState = { savedAt: new Date().toISOString(), statuses };
    localStorage.setItem(LAST_RESULT_KEY, JSON.stringify(result));
    setLastResult(result);
  }, [started, isFinished, statuses]);

  const handleStart = () => setStarted(true);
  const handleCourseStart = (m: Mode) => {
    setMode(m);
    setStarted(false); // 状態リセット
  };

  const handleConfirm = () => {
    setStatuses((prev) => {
      const next = [...prev];
      next[currentIndex] = 'checked';
      // 次の未確認へジャンプ
      const nextIdx = findNextPendingIndex(next, currentIndex);
      setCurrentIndex(nextIdx === -1 ? currentIndex : nextIdx);
      return next;
    });
  };

  const handleSkip = () => {
    setStatuses((prev) => {
      const next = [...prev];
      next[currentIndex] = 'skipped';
      const nextIdx = findNextPendingIndex(next, currentIndex);
      setCurrentIndex(nextIdx === -1 ? currentIndex : nextIdx);
      return next;
    });
  };

  const handleReset = () => {
    setStarted(false);
    setCurrentIndex(0);
    setStatuses(Array(targetGoods.length).fill('pending'));
    localStorage.removeItem(STORAGE_KEY);
  };

  if (totalTarget === 0) {
    return <div className="p-4 text-center">持ち物データがありません</div>;
  }

  if (!started) {
    // コースボタンリスト生成
    const courseButtons = [];
    if (mode !== 'jaxa' && hasJaxa && courseGoods['jaxa']) {
      courseButtons.push(
        <button key="jaxa" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => handleCourseStart('jaxa')}>
          JAXA持ち物確認へ
        </button>
      );
    }
    if (mode !== 'okutama' && hasOkutama && courseGoods['okutama']) {
      courseButtons.push(
        <button key="okutama" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => handleCourseStart('okutama')}>
          奥多摩ラフティング持ち物確認へ
        </button>
      );
    }
    if (mode !== 'doukutsu' && day4key === 'doukutsu' && courseGoods['doukutsu']) {
      courseButtons.push(
        <button key="doukutsu" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => handleCourseStart('doukutsu')}>
          洞窟コース持ち物確認へ
        </button>
      );
    }
    if (mode !== 'kanuu' && day4key === 'kanuu' && courseGoods['kanuu']) {
      courseButtons.push(
        <button key="kanuu" className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={() => handleCourseStart('kanuu')}>
          カヌーコース持ち物確認へ
        </button>
      );
    }
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">
          {mode === 'main'
            ? '持ち物確認'
            : mode === 'jaxa'
              ? 'JAXA持ち物確認'
              : mode === 'okutama'
                ? '奥多摩ラフティング持ち物確認'
                : mode === 'doukutsu'
                  ? '洞窟コース持ち物確認'
                  : mode === 'kanuu'
                    ? 'カヌーコース持ち物確認'
                    : '持ち物確認'}
        </h1>
        <p className="text-gray-600">スタートすると順番に持ち物を確認できます。</p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleStart}>
          スタート
        </button>
        {/* コース専用ボタン（main以外でも他コースに遷移可能） */}
        {courseButtons.length > 0 && <div className="flex flex-col gap-2 w-full items-center">{courseButtons}</div>}
        {/* コースからmainへ戻るボタン */}
        {mode !== 'main' && (
          <button
            className="px-4 py-2 bg-gray-400 text-white rounded"
            onClick={() => {
              setMode('main');
              setStarted(false);
            }}>
            共通持ち物確認へ戻る
          </button>
        )}
        {lastResult && (
          <div className="w-full max-w-md mt-4 p-3 border rounded bg-white">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">前回の記録（{new Date(lastResult.savedAt).toLocaleString()}）</div>
              <div className="flex gap-2">
                <button
                  className="text-sm text-red-600 underline"
                  onClick={() => {
                    localStorage.removeItem(LAST_RESULT_KEY);
                    setLastResult(null);
                  }}>
                  削除
                </button>
              </div>
            </div>
            {
              <div className="mt-2 divide-y">
                {lastResult.statuses.length === totalTarget ? (
                  targetGoods.map((g, idx) => {
                    const s = lastResult.statuses[idx];
                    const badge =
                      s === 'checked'
                        ? { text: '確認済み', cls: 'bg-green-100 text-green-700' }
                        : s === 'skipped'
                          ? { text: 'スキップ', cls: 'bg-yellow-100 text-yellow-800' }
                          : { text: '未確認', cls: 'bg-gray-100 text-gray-700' };
                    return (
                      <div key={g.name} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="text-xl" aria-hidden>
                            {g.icon}
                          </div>
                          <div className="text-sm">{g.name}</div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.text}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-600">データが更新されたため前回の記録を表示できません。</div>
                )}
              </div>
            }
          </div>
        )}
        <BackToHome user={user} />
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="p-6 flex flex-col items-center gap-4">
        <h1 className="text-2xl font-bold">確認完了</h1>
        <p>
          {doneCount} / {totalTarget} を確認しました。
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleReset}>
            もう一度やる
          </button>
          {statuses.some((s) => s === 'skipped') && (
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={() => {
                setStatuses((prev) => {
                  const next = prev.map((s) => (s === 'skipped' ? 'pending' : 'checked')) as ItemStatus[];
                  const idx = findNextPendingIndex(next, -1);
                  setCurrentIndex(idx === -1 ? 0 : idx);
                  setStarted(true);
                  return next;
                });
              }}>
              スキップ分を再チェック
            </button>
          )}
        </div>
        {/* コースから戻るボタン */}
        {mode !== 'main' && (
          <button
            className="px-4 py-2 bg-gray-400 text-white rounded"
            onClick={() => {
              setMode('main');
              setStarted(false);
            }}>
            共通持ち物確認へ戻る
          </button>
        )}
        {lastResult && (
          <div className="w-full max-w-md mt-2 p-3 border rounded bg-white divide-y">
            <div className="text-sm text-gray-700 mb-2">前回の記録（{new Date(lastResult.savedAt).toLocaleString()}）</div>
            {lastResult.statuses.length === totalTarget ? (
              targetGoods.map((g, idx) => {
                const s = lastResult.statuses[idx];
                const badge =
                  s === 'checked'
                    ? { text: '確認済み', cls: 'bg-green-100 text-green-700' }
                    : s === 'skipped'
                      ? { text: 'スキップ', cls: 'bg-yellow-100 text-yellow-800' }
                      : { text: '未確認', cls: 'bg-gray-100 text-gray-700' };
                return (
                  <div key={g.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className="text-xl" aria-hidden>
                        {g.icon}
                      </div>
                      <div className="text-sm">{g.name}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.text}</span>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-gray-600">データが更新されたため前回の記録を表示できません。</div>
            )}
          </div>
        )}
        <BackToHome user={user} />
      </div>
    );
  }

  const item = targetGoods[currentIndex];
  const completedCount = totalTarget - pendingCount;
  const progressText = `${completedCount} / ${totalTarget}`;

  return (
    <div className="p-6 flex flex-col items-center gap-6">
      <h1 className="text-2xl font-bold">
        {mode === 'main'
          ? '持ち物確認'
          : mode === 'jaxa'
            ? 'JAXA持ち物確認'
            : mode === 'okutama'
              ? '奥多摩ラフティング持ち物確認'
              : mode === 'doukutsu'
                ? '洞窟コース持ち物確認'
                : mode === 'kanuu'
                  ? 'カヌーコース持ち物確認'
                  : '持ち物確認'}
      </h1>

      {/* タブ（チェック / 一覧） */}
      <div className="w-full max-w-md">
        <div className="flex border-b mb-4">
          <button className={`px-4 py-2 -mb-[1px] ${activeTab === 'flow' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('flow')}>
            チェック
          </button>
          <button className={`px-4 py-2 -mb-[1px] ${activeTab === 'list' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-600'}`} onClick={() => setActiveTab('list')}>
            一覧
          </button>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="w-full max-w-md">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>進捗</span>
          <span>{progressText}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded">
          <div className="h-2 bg-blue-500 rounded" style={{ width: `${(completedCount / totalTarget) * 100}%` }} />
        </div>
      </div>

      {activeTab === 'flow' ? (
        <>
          {/* アイコンと名前 */}
          <div className="flex flex-col items-center gap-3">
            <div className="text-7xl select-none" aria-hidden>
              {item.icon}
            </div>
            <div className="text-xl font-semibold">{item.name}</div>
          </div>

          {/* 操作ボタン */}
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleConfirm}>
              確認
            </button>
            <button className="px-4 py-2 bg-gray-300 text-gray-900 rounded" onClick={handleSkip}>
              スキップ
            </button>
          </div>
        </>
      ) : (
        <div className="w-full max-w-md bg-white rounded shadow-sm divide-y">
          {targetGoods.map((g, idx) => {
            const s = statuses[idx];
            const badge =
              s === 'checked'
                ? { text: '確認済み', cls: 'bg-green-100 text-green-700' }
                : s === 'skipped'
                  ? { text: 'スキップ', cls: 'bg-yellow-100 text-yellow-800' }
                  : { text: '未確認', cls: 'bg-gray-100 text-gray-700' };
            return (
              <div key={g.name} className="flex items-center justify-between p-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="text-2xl" aria-hidden>
                    {g.icon}
                  </div>
                  <div className="text-sm font-medium">{g.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${badge.cls}`}>{badge.text}</span>
                  <button
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setActiveTab('flow');
                    }}>
                    ここへ移動
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* コースから戻るボタン */}
      {mode !== 'main' && (
        <button
          className="text-sm text-gray-500 underline"
          onClick={() => {
            setMode('main');
            setStarted(false);
          }}>
          共通持ち物確認へ戻る
        </button>
      )}
      {/* リセット */}
      <button className="text-sm text-gray-500 underline" onClick={handleReset}>
        やり直す/終了
      </button>
    </div>
  );
};

export default GoodsCheck;
