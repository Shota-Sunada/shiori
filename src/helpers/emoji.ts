// emoji.ts
// 絵文字IDとラベル・説明のマッピング

export interface EmojiInfo {
  id: number;
  emoji: string;
  label: string;
  description?: string;
}

export const EMOJI_LIST: EmojiInfo[] = [
  { id: 1, emoji: '👍', label: 'いいね' },
  { id: 2, emoji: '❤️', label: 'ハート' },
  { id: 3, emoji: '☺️', label: 'にっこり' }
];

export const EMOJI_MAP: Record<number, EmojiInfo> = Object.fromEntries(EMOJI_LIST.map((e) => [e.id, e]));

export function getEmojiById(id: number): EmojiInfo | undefined {
  return EMOJI_MAP[id];
}

export function renderEmoji(id: number, withLabel = false): string {
  const info = getEmojiById(id);
  if (!info) return '';
  return withLabel ? `${info.emoji} ${info.label}` : info.emoji;
}
