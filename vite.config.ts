import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['appicon.png'],
        manifest: {
          name: 'RecompX',
          short_name: 'RecompX',
          description: 'Fitness body recomp app with progressive overload tracking.',
          theme_color: '#0A0A0A',
          background_color: '#0A0A0A',
          display: 'standalone',
          icons: [
            {
              src: 'appicon.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'appicon.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      }),
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
