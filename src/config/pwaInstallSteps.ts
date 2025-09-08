/**
 * PWA インストール詳細手順定義
 *
 * このファイルを編集するだけで各 OS / ブラウザ毎の表示手順を変更できます。
 * 追加/変更後は再ビルドしてください。
 */

export type InstallStepsBlock = {
  type: 'steps';
  title: string;
  steps: string[];
  note?: string;
};

export type InstallNoteBlock = {
  type: 'note';
  title: string;
  body: string;
};

export type InstallBlock = InstallStepsBlock | InstallNoteBlock;

// 特定環境で詳細手順自体を表示しない（メッセージのみ）ようにしたい場合の指定。
// 条件に合致すると InstallPWA 側で "この環境でのインストール手順は不要です" を表示。
// 例: iOS Safari や デスクトップ Chrome では十分直感的なので隠したい等
// 必要に応じて要素を追加してください (os / browser いずれか省略可: 省略時はワイルドカード扱い)
const HIDE_DETAILED_STEPS: { os?: string; browser?: string }[] = [
  // { os: 'iOS', browser: 'Safari' },
  // { os: 'Windows', browser: 'Chrome' },
];

export function shouldHideDetailedSteps(os: string, browser: string): boolean {
  return HIDE_DETAILED_STEPS.some((r) => (r.os ? r.os === os : true) && (r.browser ? r.browser === browser : true));
}

/**
 * 環境に応じたブロックを返す。
 * 必要に応じて条件分岐を編集したり、新しいブラウザ別ケースを追加してください。
 */
export function getDetailedInstallBlock(os: string, browser: string, isIOS: boolean): InstallBlock {
  // iOS (Safari のみ公式サポート)
  if (isIOS) {
    return {
      type: 'steps',
      title: 'iOS / iPadOS (Safari)',
      steps: ['Safari で開く (他ブラウザ不可)', '共有ボタン(□↑) をタップ', '「ホーム画面に追加」を選択', '右上「追加」で完了', 'ホーム画面への追加を確認'],
      note: '共有メニューに無い場合: 端末再起動 / iOS を最新化'
    };
  }

  // Android Chrome / Edge
  if (os === 'Android') {
    if (browser === 'Chrome') {
      return {
        type: 'steps',
        title: `Android (${browser})`,
        steps: ['上または下にある、メニュー(︙ / …) を押す', '「ホーム画面に追加」から「インストール」を選択', 'ホーム画面への追加を確認'],
        note: '項目が無い場合: 最新版へ更新 / 何度かページをリロード'
      };
    } else if (browser === 'Edge') {
      return {
        type: 'steps',
        title: `Android (${browser})`,
        steps: [
          '上または下にある、メニューの「≡」ボタンを押す',
          '「ホーム」や「拡張機能」のある下の段から、「電話に追加」を探す (2ページ目もあります)',
          '「電話に追加」から「インストール」を選択',
          'ホーム画面への追加を確認'
        ],
        note: '項目が無い場合: 最新版へ更新 / 何度かページをリロード'
      };
    }
  }

  // Android その他ブラウザ
  if (os === 'Android') {
    return {
      type: 'note',
      title: 'Android (その他)',
      body: '現在使用中のブラウザは動作確認ができていない、もしくは一部の機能が制限されているので、Chrome または Edge の利用を推奨します。詳しくはページ下部の「対応ブラウザ一覧」をご確認ください。'
    };
  }

  const isDesktop = ['Windows', 'macOS', 'Linux'].includes(os);

  if (isDesktop && browser === 'Chrome') {
    return {
      type: 'steps',
      title: 'デスクトップ Chrome',
      steps: ['URL バー右の「インストール」アイコン または ︙ メニュー', '「インストール」を選択', 'ダイアログで追加'],
      note: '表示されない場合: 何度か再読込 / 最新版確認'
    };
  }

  if (isDesktop && browser === 'Edge') {
    return {
      type: 'steps',
      title: 'デスクトップ Edge',
      steps: ['右上 … メニュー → アプリ', '「このサイトをインストール」', 'ダイアログで追加']
    };
  }

  if (isDesktop) {
    return {
      type: 'note',
      title: 'その他デスクトップ',
      body: 'インストールサポート限定的。Chrome / Edge への切替推奨。'
    };
  }

  // フォールバック (未知環境)
  return { type: 'note', title: '不明な環境', body: 'この環境では標準手順が未定義です。推奨ブラウザでの利用を検討してください。' };
}

/**
 * 概要ステップ (上部短縮表示用) - 必要なら編集。
 */
export function getOverviewSteps(os: string, browser: string, isIOS: boolean): string[] {
  if (isIOS) return ['Safari でこのページを開く', '共有(□↑) をタップ', '「ホーム画面に追加」→ 追加'];
  if (os === 'Android') {
    if (browser === 'Chrome' || browser === 'Edge') return ['右上メニュー(︙ / …)', '「インストール」選択', '追加を確認'];
    return ['Chrome で開き直すとインストール可', '現在ブラウザのメニュー「ホーム画面に追加」類似項目'];
  }
  if (['Windows', 'macOS', 'Linux'].includes(os)) {
    if (browser === 'Chrome') return ['右上︙ → インストール', 'またはURLバー右アイコン', '確認で追加'];
    if (browser === 'Edge') return ['右上 … → アプリ → このサイトをインストール', '確認で追加'];
    return ['Chrome / Edge でインストール項目が利用可', '現ブラウザでもタブ利用は可'];
  }
  return ['ホーム画面追加: 推奨ブラウザをご利用ください'];
}
