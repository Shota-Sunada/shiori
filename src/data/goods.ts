export interface GOODS {
  name: string;
  note?: string[];
  icon: string[];
}

export const GOODS_DATA: GOODS[] = [
  { name: 'PC・充電器', icon: ['💻'] },
  { name: '雨具', icon: ['🥼', '☂️'], note: ['折り畳み傘、レインコート等'] },
  { name: '手荷物用バッグ', icon: ['👜'], note: ['リュックサックなど'] },
  { name: '筆記用具', icon: ['✏️'] },
  { name: '学生証', icon: ['🪪'] },
  { name: '交通系ICカード', icon: ['💳️'], note: ['モバイルSuicaなどでもOK', 'MOBIRY DAYS は使用できません。'] },
  { name: '緊急連絡先', icon: ['📝'], note: ['担任、添乗員携帯番号'] },
  { name: '保険証 (コピー可)', icon: ['🪪'], note: ['保険証が紐づいたマイナンバーカードも可'] },
  { name: 'タオル', icon: ['🧻'], note: ['ホテル備品は持ち出し現金'] },
  { name: '着替え', icon: ['👕', '👖', '🧦'], note: ['下着、靴下など'] },
  { name: 'お小遣い', icon: ['💰'] },
  { name: '常備薬', icon: ['💊'], note: ['酔い止めなど'] },
  { name: '腕時計', icon: ['⌚️'], note: ['必要な人'] },
  { name: 'マスク', icon: ['😷'], note: ['必要な人'] },
  { name: '携帯電話・充電器', icon: ['📱'] },
  { name: '日焼け止め', icon: ['😎'], note: ['必要な人'] }
];

export const GOODS_JAXA: GOODS[] = [
  { name: '上履き', icon: ['🥿'], note: ['体育館シューズ等'] },
  { name: 'ビニール袋', icon: ['🛍️'], note: ['下足入れ'] }
];

export const GOODS_OKUTAMA: GOODS[] = [
  { name: '水着または濡れてもいいアンダーウェア', icon: ['👕'], note: ['水着はウェットスーツの下に着用'] },
  { name: '濡れてもいい靴', icon: ['👟'], note: ['ウォーターシューズ等、踵の固定出来る物。サンダル不可。'] },
  { name: '眼鏡の方は眼鏡バンド', icon: ['👓', '🪢'], note: ['川に落とすと取ることは困難です'] },
  { name: 'フェイスタオル', icon: ['💦'], note: ['※スーツケースに入れない'] },
  { name: 'バスタオル', icon: ['🚿'], note: ['体験後のシャワー用', '※スーツケースに入れない'] }
];

export const GOODS_DOKUTSU: GOODS[] = [
  { name: '汚れても良い服装', icon: ['👕', '👖'], note: ['長ズボン・運動靴', '上着は半袖でもいいが五合目は寒暖差があるので長袖も持ってくることを推奨'] },
  { name: '防寒対策用の上着1枚', icon: ['🧥'], note: ['フリース等'] },
  { name: 'リュックサック', icon: ['🛄'] },
  { name: 'タオル', icon: ['😥'] },
  { name: 'かっぱ (レインコート)', icon: ['👕'], note: ['セパレートタイプ'] },
  { name: '軍手', icon: ['🧤'] }
];

export const GOODS_KANU: GOODS[] = [
  { name: '濡れてもいい靴', icon: ['👟'], note: ['カヌーの性質上水しぶきがかかる程度なので水着は不要'] },
  { name: '汚れてもいい服装', icon: ['👕', '👖'], note: ['カヌーの性質上水しぶきがかかる程度なので水着は不要'] },
  { name: 'リュックサック', icon: ['🛄'] },
  { name: 'タオル', icon: ['😥'] },
  { name: 'かっぱ (レインコート)', icon: ['👕'] },
  { name: 'PETボトル飲料 (湖上での飲料)', icon: ['🍵'] }
];
