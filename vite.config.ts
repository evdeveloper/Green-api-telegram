import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_GREEN_API_URL ?? 'https://api.green-api.com';
  const useProxy = env.VITE_USE_PROXY === 'true';

  return {
    /*
     * Относительный base: собранные пути к ассетам получаются вида ./assets/...,
     * поэтому приложение одинаково работает и в корне домена, и в подпапке —
     * например на GitHub Pages по адресу /<имя-репозитория>/. Иначе ассеты
     * запрашивались бы от корня домена и отдавали 404.
     * Клиентского роутинга в приложении нет, так что глубоких путей, которым
     * относительный base мог бы навредить, тоже нет.
     */
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Страховка от CORS: при VITE_USE_PROXY=true клиент ходит на /green-api,
      // а dev-сервер проксирует запросы в GREEN-API. См. api/endpoints.ts.
      proxy: useProxy
        ? {
            '/green-api': {
              target: apiUrl,
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/green-api/, ''),
            },
          }
        : undefined,
    },
  };
});
