import type { IntRange } from 'type-fest';

export type student = {
  surname: string;
  forename: string;
  class: IntRange<1, 8>;
  number: IntRange<1, 42>;
  gakuseki: number;
  day1id:
    | 'yrp_nifco'
    | 'yrp_yamashin'
    | 'yrp_air'
    | 'yrp_vtech'
    | 'ntt_labo_i'
    | 'ntt_labo_b'
    | 'kayakku'
    | 'iaxa'
    | 'astro'
    | 'arda'
    | 'urth_jip'
    | 'micro'
    | 'air';
  day3id: 'okutama' | 'yokosuka' | 'hakone' | 'kamakura' | 'hakkeijima' | 'yokohama';
  day1bus: string;
  day3bus: string;
  room_shizuoka: string;
  room_tokyo: string;
  tag: string;
};
