import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigpaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json'; // package.jsonをインポート

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
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
        },
      },
    },
  },
  plugins: [
    react(),
    tsconfigpaths(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '修学旅行のしおり for 79th',
        description: '修道高校79回生のための修学旅行のしおり',
        icons: [
          {
            sizes: '192x192',
            src: 'icon.png',
            type: 'image/png'
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