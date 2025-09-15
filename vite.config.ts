import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigpaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json'; // package.jsonをインポート

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: '/', // ここにベースパスを追加
  define: {
    // process.envからpackage.jsonのインポートに切り替え
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor_firebase';
            }
            if (id.includes('react')) {
              return 'vendor_react';
            }
          }
        }
      }
    }
  },
  plugins: [
    react(),
    tsconfigpaths(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: '',
      filename: 'firebase-messaging-sw.js',
      manifest: {
        name: '修学旅行のしおり for 79th',
        short_name: 'しおり79th',
        description: '修道高校79回生のための修学旅行のしおり',
        theme_color: '#607d8b', // 目立ちすぎない落ち着いたブルーグレー
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            sizes: '192x192',
            src: 'icon.png',
            type: 'image/png'
          },
          // 必要であれば 512x512 も同一ファイルで流用（実サイズが充分であることを確認）
          {
            sizes: '512x512',
            src: 'icon.png',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    }),
    ...(command === 'build'
      ? [
          obfuscatorPlugin({
            options: {
              compact: true,
              controlFlowFlattening: false,
              deadCodeInjection: false,
              debugProtection: false,
              disableConsoleOutput: true,
              identifierNamesGenerator: 'hexadecimal',
              log: false,
              renameGlobals: false,
              rotateStringArray: true,
              selfDefending: true,
              stringArray: true,
              stringArrayEncoding: ['none'],
              stringArrayThreshold: 0.75,
              unicodeEscapeSequence: false
            }
          })
        ]
      : [])
  ]
}));
