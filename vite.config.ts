import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'serve-root-appicon',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/appicon.png') {
              const file = path.resolve(__dirname, 'appicon.png');
              if (fs.existsSync(file)) {
                res.setHeader('Content-Type', 'image/png');
                fs.createReadStream(file).pipe(res);
                return;
              }
            }
            next();
          });
        },
        generateBundle() {
          const file = path.resolve(__dirname, 'appicon.png');
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file);
            this.emitFile({
              type: 'asset',
              fileName: 'appicon.png',
              source: content
            });
          }
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
