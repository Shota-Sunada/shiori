export const DAY4_DATA: DAY4[] = [
  {
    class: 1,
    key: 'doukutsu',
    teachers: ['山口先生', '町先生', '安本先生']
  },
  { class: 2, key: 'fujikyu', teachers: ['片山先生', '久保田先生', '兼森先生'] },
  { class: 3, key: 'fujikyu', teachers: ['濱桐先生', '古川先生'] },
  { class: 4, key: 'doukutsu', teachers: ['藤島先生', '宅見先生'] },
  { class: 5, key: 'kanuu', teachers: ['白砂先生', '城崎先生', '藏下先生'] },
  { class: 6, key: 'fujikyu', teachers: ['大原先生', '原田先生'] },
  { class: 7, key: 'doukutsu', teachers: ['立上先生', '土肥先生'] }
];

interface DAY4 {
  class: number;
  key: 'doukutsu' | 'fujikyu' | 'kanuu';
  teachers: string[];
}
