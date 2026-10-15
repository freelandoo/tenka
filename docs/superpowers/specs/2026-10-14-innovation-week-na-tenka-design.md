# Innovation Week dentro da TENKA — design

Data: 2026-10-14 · Entrega 1 de 4 (as outras: portfólios Games, Studios, Tech).

## Objetivo

Todo o projeto do astronauta (repositório `freelandoo/inoovation`) passa a viver em
`tenkagroup.com.br/innovation-week`, sem nenhum link para domínio externo, e com os
QRs já impressos (via Realizse) continuando a funcionar **sem a Realizse mudar nada**.
A home ganha um 4º card, Innovation Week, com a página renderizada ao vivo.

## Situação de partida

- Front: Vite + TS puro + three.js, multi-página (`index`, `jogo`, `ranking`, `membro`,
  `telao`, `admin`, `apresentacao`, `privacidade`), Vercel projeto `frontend`, único
  domínio `frontend-tau-weld-99.vercel.app` (é para lá que a Realizse redireciona).
- API: Hono + Postgres, Railway projeto `loving-hope`, serviço `inoovation`
  (`inoovation-production.up.railway.app`).
- TENKA: Vercel projeto `tenka`, Root Directory `frontend`, arquivos fora da raiz
  permitidos, produção = `master`.

## Decisões

1. **Código no monorepo, sem reescrita.** `innovation-week/frontend` e
   `innovation-week/backend` (cópia dos arquivos versionados de `inoovation`; o histórico
   fica no repositório antigo, que vira arquivo). O front continua Vite/TS puro.
2. **Base `/innovation-week/`.** `vite.config` usa `base: '/innovation-week/'`; todo
   caminho absoluto do código (assets `/models`, `/ar`, `/innovation-week/...`, links
   `/jogo`, `/membro/...`, `/privacidade`, `/ranking`, chamadas `/api/...`) passa por um
   helper `withBase()` baseado em `import.meta.env.BASE_URL`. O resolvedor de identidade
   remove o prefixo antes de ler `/01/...`, `/innovation/...` (testado).
3. **Build único.** O `build` do frontend da TENKA compila a Innovation Week e copia o
   `dist` dela para `frontend/dist/innovation-week/`.
4. **Rotas na Vercel (TENKA).** Rewrites, nesta ordem: `/innovation-week/api/:p*` → API
   na Railway; páginas (`membro/:token`, `membro`, `telao`, `admin/apresentacao`,
   `admin`, `ranking`, `jogo`, `privacidade`) → respectivo `.html`; demais
   `/innovation-week/*` que não sejam arquivo → `/innovation-week/index.html`; resto →
   SPA da TENKA.
5. **API pela mesma origem.** `VITE_API_URL` da Innovation Week = `/innovation-week`
   (relativa). O backend passa a obter o IP do visitante de `x-vercel-forwarded-for` /
   `x-real-ip` quando vier pelo proxy, para o rate limit não tratar todos como o IP da
   Vercel. `ALLOWED_ORIGINS` ganha `https://tenkagroup.com.br` e
   `https://www.tenkagroup.com.br`.
6. **Railway.** O serviço `inoovation` passa a deployar de `freelandoo/tenka`, root
   `innovation-week/backend`, watch paths restritos a essa pasta. Mesmo banco e variáveis.
7. **Realizse intocada.** O projeto Vercel antigo `frontend` vira só um redirecionamento
   308 de `/(.*)` para `https://tenkagroup.com.br/innovation-week/$1` (query preservada).
   Feito por último, depois da validação em produção.
8. **Home com 4 cards.** Novo slide `innovation-week` (divisão `innovation`), fundo
   preto espacial com acento vermelho `#ff1a1a`, `previewUrl: '/innovation-week/'`,
   CTA para `/innovation-week`. O repositório de slides em `localStorage` passa a
   acrescentar slides padrão ausentes, para visitantes antigos também verem o card.

## Ordem de entrada no ar

1. Código + testes (IW `node --test`, typecheck; TENKA `vitest`, build).
2. Preview Vercel da branch + verificação Playwright (landing, rota GS1, jogo, ranking,
   membro, proxy da API).
3. Merge em `master` → produção TENKA; validar.
4. Railway: trocar fonte do serviço e `ALLOWED_ORIGINS`.
5. Projeto `frontend` antigo → redirecionamento; testar URL GS1 antiga ponta a ponta.

## Riscos

- Caminho absoluto esquecido → asset 404 sob o prefixo. Mitigação: grep de `'/` e
  verificação Playwright registrando requisições 404.
- RA/câmera dentro de iframe do card da home: o card só exibe; câmera só é pedida após
  ação do usuário na página real.
- Proxy da API e IP real (decisão 5).

## Fora do escopo

Portfólios Games / Studios / Tech (entregas 2–4).
