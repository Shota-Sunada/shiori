import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SERVER_ENDPOINT } from '../config/serverEndpoint';

export default function VersionMismatch() {
  const clientVersion = import.meta.env.APP_VERSION;
  const [serverVersion, setServerVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${SERVER_ENDPOINT}/api/version`, { cache: 'no-store' });
        if (!res.ok) throw new Error(res.status + ' ' + res.statusText);
        const data: { version?: string } = await res.json();
        if (!aborted) setServerVersion(data.version || null);
      } catch (e) {
        if (!aborted) setError(String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const handleReload = useCallback(() => {
    // 完全リロードで新しいアセットを取得
    window.location.reload();
  }, []);

  const mismatch = serverVersion && clientVersion && serverVersion !== clientVersion;

  // 一致していたら元のページ (state.from) か トップへ自動遷移
  useEffect(() => {
    if (!loading && serverVersion && clientVersion && serverVersion === clientVersion) {
      const state = location.state as { from?: string } | null;
      const target = state?.from && state.from !== '/version-mismatch' ? state.from : '/';
      navigate(target, { replace: true });
    }
  }, [loading, serverVersion, clientVersion, navigate, location.state]);

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-4">バージョン不一致を検出</h1>
      <div className="mb-4 text-sm leading-relaxed max-w-md space-y-3">
        <p>この端末にキャッシュされているフロントエンドとサーバーのバージョンが一致しません。最新のデータを取得するため再読み込みを行ってください。</p>
        <div className="rounded bg-white/70 px-4 py-3 text-left text-xs font-mono space-y-1 border border-gray-300">
          <p>
            <span className="font-semibold">Client:</span> v{clientVersion || 'unknown'}
          </p>
          <p>
            <span className="font-semibold">Server:</span> {loading ? '取得中...' : serverVersion ? 'v' + serverVersion : error ? '取得失敗 (' + error + ')' : 'not-found'}
          </p>
          {serverVersion && clientVersion && (
            <p>
              <span className="font-semibold">Status:</span> {mismatch ? <span className="text-red-600">Mismatch</span> : <span className="text-green-600">Match (ページ遷移で復帰可)</span>}
            </p>
          )}
        </div>
        {serverVersion === clientVersion && !loading && <p className="text-xs text-green-700 bg-green-100 px-3 py-2 rounded">バージョンは一致しています。元のページへ移動しています...</p>}
      </div>
      <div className="flex gap-4">
        <button onClick={handleReload} className="px-6 py-3 rounded bg-[#50141c] text-white text-sm font-semibold shadow hover:opacity-90 active:scale-[0.98]">
          完全再読み込み
        </button>
        <button onClick={() => window.location.assign('/')} className="px-5 py-3 rounded bg-gray-300 text-gray-800 text-sm font-semibold shadow hover:bg-gray-200 active:scale-[0.98]">
          トップへ戻る
        </button>
      </div>
      <p className="mt-6 text-xs text-gray-500 max-w-sm leading-relaxed">それでも解消しない場合: 端末の「アプリ(ホーム画面追加PWA)を閉じて再起動」またはブラウザのキャッシュ削除を試してください。</p>
    </div>
  );
}
