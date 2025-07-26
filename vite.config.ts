import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigpaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tsconfigpaths(),
    tailwindcss(),
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
              stringArrayEncoding: ["none"],
              stringArrayThreshold: 0.75,
              unicodeEscapeSequence: false
              // compact: true,
              // controlFlowFlattening: true,
              // controlFlowFlatteningThreshold: 0.75,
              // deadCodeInjection: true,
              // deadCodeInjectionThreshold: 0.4,
              // debugProtection: true,
              // disableConsoleOutput: true,
              // identifierNamesGenerator: 'hexadecimal',
              // // domainLock: ['.shudo-physics.com'],
              // log: false,
              // renameGlobals: false,
              // rotateStringArray: true,
              // sourceMap: false,
              // selfDefending: true,
              // stringArray: true,
              // stringArrayEncoding: ['base64'],
              // stringArrayThreshold: 0.75,
              // transformObjectKeys: true,
              // unicodeEscapeSequence: false
            }
          })
        ]
      : [])
  ]
}));
