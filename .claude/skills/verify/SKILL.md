---
name: verify
description: How to build, launch and drive the TENKA site (including the /games WebGL experience) for runtime verification.
---

# Verificação do TENKA

## Build / launch
- `npx tsc -b` — typecheck (tsc project refs).
- `npm run dev` — Vite. **Atenção:** a porta 5173 costuma estar ocupada por outro projeto local; o Vite cai para 5174+. Leia a porta no output antes de abrir o browser.
- `npm run build` — build de produção (o chunk do /games tem ~1.2MB por causa do Three.js; é lazy-loaded, warning esperado).

## Drive (browser)
- Playwright não é dependência do repo. Instale em um scratchpad (`npm i playwright`) e use `chromium.launch({ channel: 'msedge' })` — evita download de browser no Windows.
- Google Fonts falha com `ERR_NETWORK_ACCESS_DENIED` no ambiente sandboxed e `/favicon.ico` dá 404 — ambos ambientais/pré-existentes, não são bugs.
- Rota principal a verificar: `http://localhost:<porta>/games`.
  - Boot dura ~1.5s; espere ~3s após goto antes do primeiro screenshot.
  - Hero é pinned (~230%): use `page.mouse.wheel` para atravessar o portal.
  - Nav: botões `MUNDOS`, `PROCESSO`, `LAB`, `CONTATO` — use `exact: true` (colidem com "VER PROCESSO" etc.).
  - Modal de briefing: hover no CTA final troca o texto para "PORTAL PRONTO"; submit loga `TENKA // NOVO BRIEFING DE PROJETO` no console.
- Fluxos que valem sondar: validação vazia por passo do modal, e-mail inválido, preservação de dados ao voltar/avançar, Escape fecha, `reducedMotion: 'reduce'` (sem pin/lenis) e viewport mobile 390px (carrossel snap em #mundos).
- Erros de render 3D aparecem como `pageerror` repetido por frame e derrubam a árvore React inteira (página laranja em branco) — capture console cedo.
