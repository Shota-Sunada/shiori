// PostCSS 設定 (ESM)
// 明示的に import して実行する形に変更し、モジュール解決エラーを回避
import tailwind from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [tailwind(), autoprefixer()]
};
