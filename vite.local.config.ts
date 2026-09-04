import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import { POST as analyzeSaju } from './app/api/analyze/route';

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function localAnalyzeApi(): Plugin {
  return {
    name: 'local-saju-analysis-api',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (request, response: ServerResponse) => {
        if (request.method !== 'POST') {
          response.statusCode = 405;
          response.end('Method Not Allowed');
          return;
        }

        try {
          const body = await readBody(request);
          const apiResponse = await analyzeSaju(
            new Request('http://localhost/api/analyze', {
              method: 'POST',
              headers: { 'Content-Type': request.headers['content-type'] || 'application/json' },
              body,
            }),
          );
          response.statusCode = apiResponse.status;
          apiResponse.headers.forEach((value, key) => response.setHeader(key, value));
          response.end(Buffer.from(await apiResponse.arrayBuffer()));
        } catch (error) {
          console.error('Local analysis API failed:', error);
          response.statusCode = 500;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.end(JSON.stringify({ error: '로컬 분석 서버에서 오류가 발생했습니다.' }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  process.env.OPENAI_MODEL = env.OPENAI_MODEL || process.env.OPENAI_MODEL;

  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [react(), localAnalyzeApi()],
    publicDir: 'public',
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
    server: { host: 'localhost', port: 3000, strictPort: true },
  };
});
