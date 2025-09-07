// 共通定数群
// ポーリング間隔や軽量な UI 調整値を集中管理する

export const POLL_INTERVALS = {
  rollCallList: 5000,
  rollCallViewer: 5000
} as const;

// 点呼残り時間表示での猶予秒数 (UI で 00:00 表示にしたいタイミング調整)
export const ROLLCALL_GRACE_OFFSET_SECONDS = 20;

// 追加が増えたらドメイン毎にネームスペース化検討
