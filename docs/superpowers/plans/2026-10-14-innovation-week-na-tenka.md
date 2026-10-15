# Innovation Week na TENKA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir todo o projeto Innovation Week em `tenkagroup.com.br/innovation-week`, com a API proxiada pela mesma origem, o 4º card na home e o domínio antigo redirecionando (Realizse intocada).

**Architecture:** O app Vite/TS puro do astronauta entra em `innovation-week/frontend` com `base: '/innovation-week/'` e é compilado pelo build do frontend da TENKA para `frontend/dist/innovation-week/`. A API Hono entra em `innovation-week/backend`, continua no serviço Railway `inoovation` (projeto `loving-hope`), acessada via rewrite da Vercel em `/innovation-week/api/*`.

**Tech Stack:** Vite 8 + TS + three.js (IW), React 19 + Vite 6 + Vitest (TENKA), Hono + pg (API), Vercel rewrites/redirects, Railway GraphQL.

Spec: `docs/superpowers/specs/2026-10-14-innovation-week-na-tenka-design.md`.

---

## Mapa de arquivos

- Create `innovation-week/frontend/**` — cópia de `astronalta/frontend` (arquivos versionados).
- Create `innovation-week/backend/**` — cópia de `astronalta/backend` (arquivos versionados).
- Create `innovation-week/frontend/src/base.ts` — `withBase()` / `stripBase()`.
- Create `innovation-week/frontend/tests/base.test.ts`.
- Modify IW: `vite.config.ts`, `src/config.ts`, `src/identity/session.ts`, `src/member/main.ts`, `src/ui/activation.ts`, `src/game/main.ts`, `src/admin/main.ts`, `src/present/main.ts`, `src/present/main.ts`, `src/collection/catalog.ts`, `src/label/labelConfig.ts`, todos os `*.html`.
- Modify IW backend: `src/app.ts` (`clientIp`), `tests/api.test.ts`.
- Create `frontend/scripts/build-innovation-week.mjs`.
- Modify TENKA: `frontend/package.json`, `frontend/vercel.json`, `frontend/src/types/hero.ts`, `frontend/src/data/defaultHeroSlides.ts`, `frontend/src/repositories/LocalStorageHeroSlidesRepository.ts` (+ test).

---

### Task 1: Importar o código

- [ ] `git -C ../astronalta archive HEAD frontend backend | tar -x -C innovation-week` (cria `innovation-week/frontend` e `innovation-week/backend` só com arquivos versionados — sem `rotulo/`, `.csv`, `.fbx`, `.env`).
- [ ] `npm ci` em cada um; `npm run check` em cada um → verde (estado de partida).
- [ ] Commit `feat(innovation-week): importa frontend e backend do repositório inoovation`.

### Task 2: Helper de base (TDD)

`innovation-week/frontend/tests/base.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinBase, stripBasePath } from '../src/base.ts';

test('joinBase prefixa caminhos absolutos', () => {
  assert.equal(joinBase('/innovation-week/', '/jogo'), '/innovation-week/jogo');
  assert.equal(joinBase('/innovation-week/', '/'), '/innovation-week/');
  assert.equal(joinBase('/', '/jogo'), '/jogo');
});
test('stripBasePath remove o prefixo só no início', () => {
  assert.equal(stripBasePath('/innovation-week/', '/innovation-week/01/123/10/l1/21/AO'), '/01/123/10/l1/21/AO');
  assert.equal(stripBasePath('/innovation-week/', '/innovation-week'), '/');
  assert.equal(stripBasePath('/innovation-week/', '/outra/coisa'), '/outra/coisa');
  assert.equal(stripBasePath('/', '/jogo'), '/jogo');
});
```
`innovation-week/frontend/src/base.ts`:
```ts
// O site mora em /innovation-week/ dentro da TENKA. Todo caminho absoluto do
// código passa por aqui para não depender da raiz do domínio.
export function joinBase(base: string, path: string): string {
  return base.replace(/\/$/, '') + (path.startsWith('/') ? path : `/${path}`);
}
export function stripBasePath(base: string, pathname: string): string {
  const b = base.replace(/\/$/, '');
  if (!b) return pathname;
  if (pathname === b) return '/';
  return pathname.startsWith(`${b}/`) ? pathname.slice(b.length) : pathname;
}
const BASE = (import.meta.env?.BASE_URL as string | undefined) ?? '/';
export const withBase = (path: string) => joinBase(BASE, path);
export const stripBase = (pathname: string) => stripBasePath(BASE, pathname);
```
- [ ] Rodar `node --test tests/base.test.ts` antes (falha) e depois (passa). Commit.

### Task 3: Base `/innovation-week/` no app

- [ ] `vite.config.ts`: `base: '/innovation-week/'`.
- [ ] HTML: todo `href="/..."` de âncora vira `href="%BASE_URL%..."` (ex.: `href="/jogo"` → `href="%BASE_URL%jogo"`, `href="/"` → `href="%BASE_URL%"`). `src`/`srcset`/preload de assets públicos são reescritos pelo Vite com a base; conferir no `dist`.
- [ ] TS: trocar literais absolutos por `withBase(...)`: `config.ts` (modelGlb, modelUsdz, trackingLib, trackingTargets, hero.modelGlb), `collection/catalog.ts`, `label/labelConfig.ts` (`ROOT`), `game/main.ts` (pot, rig, `/membro/`, `/`, `/ranking`), `admin/main.ts`, `present/main.ts` (`/admin?next=`, urls do preload), `member/main.ts` (links + regex sobre `stripBase(location.pathname)`), `ui/activation.ts` (`memberUrl`, href `/membro`).
- [ ] CSS `url('/innovation-week/...')` é reescrito pelo Vite — conferir no `dist`.
- [ ] `identity/session.ts`: antes de `resolveIdentity`, montar o href com `stripBase(url.pathname)`; teste em `tests/resolver.test.ts` com `/innovation-week/01/1845678901001/10/l1/21/AO`.
- [ ] `config.api.baseUrl`: sem `VITE_API_URL` continua vazio; o build da TENKA passa `VITE_API_URL=/innovation-week`.
- [ ] `npm run check` verde; `grep -rnE "['\"\`]/(models|ar|membro|jogo|ranking|admin|privacidade|telao)" dist` só com ocorrências já prefixadas. Commit.

### Task 4: IP real atrás do proxy (backend)

`clientIp` passa a preferir `x-vercel-forwarded-for`:
```ts
function clientIp(c: Context): string {
  // Via tenkagroup.com.br/innovation-week/api a requisição chega pela Vercel;
  // o IP do visitante vem neste cabeçalho.
  const vercel = c.req.header('x-vercel-forwarded-for');
  if (vercel) return vercel.split(',')[0].trim();
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return c.req.header('x-real-ip') ?? 'local';
}
```
- [ ] Teste em `tests/api.test.ts`: dois IPs diferentes em `x-vercel-forwarded-for` com mesmo `x-forwarded-for` não compartilham o limite. Commit.

### Task 5: Build e rotas na TENKA

`frontend/scripts/build-innovation-week.mjs`: `npm ci` (se faltar `node_modules`) e `npm run build` em `../innovation-week/frontend` com `VITE_API_URL=/innovation-week`, depois `cp -r dist → frontend/dist/innovation-week`.
- [ ] `frontend/package.json`: `"build": "tsc -b && vite build && node scripts/build-innovation-week.mjs"`.
- [ ] `frontend/vercel.json`:
```json
"rewrites": [
  { "source": "/innovation-week/api/:path*", "destination": "https://inoovation-production.up.railway.app/api/:path*" },
  { "source": "/innovation-week/membro/:token", "destination": "/innovation-week/membro.html" },
  { "source": "/innovation-week/membro", "destination": "/innovation-week/membro.html" },
  { "source": "/innovation-week/telao", "destination": "/innovation-week/telao.html" },
  { "source": "/innovation-week/admin/apresentacao", "destination": "/innovation-week/apresentacao.html" },
  { "source": "/innovation-week/admin", "destination": "/innovation-week/admin.html" },
  { "source": "/innovation-week/ranking", "destination": "/innovation-week/ranking.html" },
  { "source": "/innovation-week/jogo", "destination": "/innovation-week/jogo.html" },
  { "source": "/innovation-week/privacidade", "destination": "/innovation-week/privacidade.html" },
  { "source": "/innovation-week/:path*", "destination": "/innovation-week/index.html" },
  { "source": "/(.*)", "destination": "/index.html" }
]
```
(Arquivos existentes têm precedência sobre rewrites na Vercel, então assets em `/innovation-week/assets/...` são servidos direto.) Headers de cache iguais aos do projeto antigo para `/innovation-week/assets/*`.
- [ ] `npm run build` em `frontend/` gera `dist/innovation-week/index.html`. Commit.

### Task 6: 4º card na home (TDD)

- [ ] `types/hero.ts`: `division: 'games' | 'multimidia' | 'desenvolvimento' | 'innovation'`; `isTenkaHeroSlide` aceita `'innovation'`.
- [ ] `defaultHeroSlides.ts`: slide `innovation-week` (order 4, eyebrow `INNOVATION WEEK`, headline `O RÓTULO\nQUE GANHOU VIDA.`, fundo `#0A0A0F`, acento `#FF1A1A`, placeholder `#2A0A0C`, `previewUrl: '/innovation-week/'`, CTA `CONHECER A INNOVATION WEEK` → `/innovation-week`).
- [ ] Repositório: após migrações, acrescentar slides padrão cujo `id` não está salvo (`order` = max+1). Teste: storage com os 3 slides antigos → `getAll()` retorna 4, o último `innovation-week`.
- [ ] Links para `/innovation-week` são navegação de documento (não `react-router`), pois é outro app — conferir `SmartLink`/CTA do hero. `npm test` + build verdes. Commit.

### Task 7: Verificação local

- [ ] Servir `frontend/dist` com servidor estático que aplica as mesmas rewrites (script em scratchpad) e rodar Playwright: `/`, `/innovation-week/`, `/innovation-week/01/1845678901001/10/l1/21/AO`, `/innovation-week/jogo`, `/innovation-week/ranking`, `/innovation-week/membro`, `/innovation-week/privacidade` — sem 404 de assets, sem erro de console.

### Task 8: Preview, produção

- [ ] Push da branch → preview Vercel; repetir verificação no preview, incluindo `GET /innovation-week/api/game/top` (proxy).
- [ ] Merge em `master` + push → produção; repetir em `https://tenkagroup.com.br`.

### Task 9: Railway

- [ ] `ALLOWED_ORIGINS` do serviço `inoovation` += `https://tenkagroup.com.br,https://www.tenkagroup.com.br`.
- [ ] Fonte do serviço → repo `freelandoo/tenka`, rootDirectory `innovation-week/backend`, watchPatterns `innovation-week/backend/**`; aguardar deploy verde e `GET /health`.

### Task 10: Redirecionamento do domínio antigo

- [ ] Deploy de produção no projeto Vercel `frontend` com apenas `vercel.json`:
```json
{ "redirects": [{ "source": "/:path*", "destination": "https://tenkagroup.com.br/innovation-week/:path*", "permanent": true }] }
```
- [ ] `curl -I "https://frontend-tau-weld-99.vercel.app/01/1845678901001/10/l1/21/AO?source=x"` → 308 para `https://tenkagroup.com.br/innovation-week/01/1845678901001/10/l1/21/AO?source=x`.
- [ ] Desconectar o Git do projeto antigo (para um push no `inoovation` não desfazer o redirect).
