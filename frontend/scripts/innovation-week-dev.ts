import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Serve `/innovation-week` no `npm run dev`.
 *
 * Em produção quem serve é o Vercel: o build copia `innovation-week/frontend`
 * para `dist/innovation-week` e o `vercel.json` reescreve as rotas. O servidor
 * de dev não sabia disso — `/innovation-week` caía no catch-all do SPA, que
 * respondia com a página "não encontrada" do router. Resultado: o card da
 * Innovation Week na vitrine da home mostrava um 404, e clicar nele também.
 *
 * Aqui o mesmo `dist/innovation-week` é servido direto. Sem build do app ainda
 * feito, o middleware sai do caminho e o comportamento é o de antes, com um
 * aviso no terminal dizendo o que rodar.
 */
const BASE = '/innovation-week';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm',
};

/** Arquivo existente para o caminho pedido, imitando as reescritas do Vercel. */
function resolveFile(root: string, pathname: string): string | null {
  const rest = pathname.slice(BASE.length).replace(/^\/+/, '');
  const segments = rest.split('/').filter(Boolean);

  const candidates = rest
    ? [
        rest,
        `${rest}.html`,
        // /admin/apresentacao -> apresentacao.html
        segments.length > 1 ? `${segments[segments.length - 1]}.html` : '',
        // /membro/:token -> membro.html
        segments.length > 1 ? `${segments[0]}.html` : '',
        'index.html',
      ]
    : ['index.html'];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const file = join(root, candidate);
    // Caminho precisa continuar dentro da pasta do app.
    if (!file.startsWith(root)) continue;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

export function innovationWeekDevPlugin(): Plugin {
  const root = resolve(process.cwd(), 'dist/innovation-week');

  return {
    name: 'tenka-innovation-week-dev',
    apply: 'serve',
    configureServer(server) {
      if (!existsSync(root)) {
        server.config.logger.warn(
          `[innovation-week] ${BASE} indisponível no dev: rode "npm run build" (ou node scripts/build-innovation-week.mjs) para gerar dist/innovation-week.`,
        );
        return;
      }

      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0];
        if (pathname !== BASE && !pathname.startsWith(`${BASE}/`)) return next();

        const file = resolveFile(root, decodeURIComponent(pathname));
        if (!file) return next();

        res.setHeader(
          'Content-Type',
          MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
        );
        createReadStream(file).pipe(res);
      });
    },
  };
}
