// Compila o site da Innovation Week (innovation-week/frontend, Vite + TS puro) e
// copia o resultado para dist/innovation-week, onde a TENKA o serve.
// Roda depois do build da TENKA (ver "build" no package.json).
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '../../innovation-week/frontend');
const target = resolve(here, '../dist/innovation-week');

const run = (cmd, env = {}) =>
  execSync(cmd, { cwd: app, stdio: 'inherit', env: { ...process.env, ...env } });

if (!existsSync(resolve(app, 'node_modules'))) run('npm ci --no-audit --no-fund');
// A API é chamada pela mesma origem: /innovation-week/api/* é repassado à Railway (vercel.json).
run('npm run build', { VITE_API_URL: '/innovation-week' });

rmSync(target, { recursive: true, force: true });
cpSync(resolve(app, 'dist'), target, { recursive: true });
console.log(`Innovation Week → ${target}`);
