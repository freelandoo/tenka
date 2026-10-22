# Site TENKA em tabloide futurista — Plano de implementação

> **Para agentes:** SUB-SKILL: superpowers:executing-plans (execução na sessão principal — subagente só planeja, nunca implementa). Passos com checkbox (`- [ ]`).

**Objetivo:** levar o site público da TENKA (`frontend/`) para a linguagem "tabloide futurista" da pele Reality da Casa Views, com uma cor por divisão — **Tech ciano `#00D9E0`**, **Studios vermelho `#E0262F`**, **Games laranja `#FF6A0A`** — começando por uma página de preços nova (`/precos`).

**Arquitetura:** uma pele CSS única com prefixo `tf-` (`frontend/src/tabloid/tabloid.css`) parametrizada por `--tf-acc` (a cor da divisão), com peças React pequenas em `frontend/src/tabloid/` (faixa em seta, título gasto, cartão de portfólio, holograma da marca). Cada página escolhe a divisão por um atributo `data-division="tech|studios|games"` no invólucro. As experiências 3D atuais de `/tech`, `/studios` e `/games` não são reescritas: ganham a pele por fora (cabeçalho, faixas, cartões), slice a slice.

**Stack:** Vite 6 + React 19 + React Router 7, Tailwind 4, three 0.185 (`three/webgpu` + TSL, igual ao `Coliseu3D`), GSAP 3 (`@gsap/react`), Lenis. Testes em Vitest.

---

## A linguagem (o que é "tabloide futurista")

Fonte: pele Reality da Casa Views (`freelandoo/docs/historico-claude/casa-views.md`, seção "RANKINGS NA COMPOSIÇÃO DA REFERÊNCIA").

| peça | Casa Views | TENKA |
|---|---|---|
| fundo | preto chapado + grade fina | preto `#04070a` + grade 48 px a 4% + ruído estático (pintado uma vez, sem animação na camada da janela) |
| título | Archivo expandido 900 com textura gasta (`.rv-grunge`) | Archivo `wdth` 125, peso 900, `.tf-grunge` (máscara de ruído SVG) |
| texto técnico | Space Mono | Space Mono, caixa alta, `letter-spacing .2em` |
| destaque | rosa | `--tf-acc` da divisão |
| faixa | faixa rosa em seta | `.tf-ribbon` com `clip-path` de seta, cor da divisão, texto preto |
| volume | cubo de vidro rosa | holograma aramado da marca TENKA (padrão `Coliseu3D`) |
| cartões | foto P&B → cor no hover, painel branco cortado, "VER" | `.tf-card`: captura do projeto em P&B → cor no hover, painel branco com canto cortado, "ABRIR ↗" |
| ritmo | AO VIVO, letra de máquina, menu de 3 linhas | selo `● NO AR`, contadores tipo máquina, cabeçalho em toda largura |

Regras fixas: cantos retos (sem `border-radius`, só ponto/indicador circular); sombra dura; movimento só em `transform`/`opacity`; `prefers-reduced-motion` desliga paralaxe, contadores e a construção do holograma (um quadro pronto).

## Mapa de arquivos

| arquivo | responsabilidade |
|---|---|
| `src/tabloid/tabloid.css` | a pele `tf-`: tokens, grade, grunge, faixa, cartões, preço |
| `src/tabloid/divisions.ts` | cor, nome e rota de cada divisão (fonte única das três cores) |
| `src/tabloid/TabloidHeader.tsx` | cabeçalho em toda largura com marca, divisões e CTA |
| `src/tabloid/hologram/geometry.ts` | símbolo TENKA → segmentos de linha 3D (extrusão + camadas) |
| `src/tabloid/hologram/scene.ts` | cena `three/webgpu` (construção, giro, inclinação, varredura, bloom) |
| `src/tabloid/hologram/TenkaHologram.tsx` | invólucro React: fallback SVG, import sob demanda, IntersectionObserver |
| `src/pricing/plans.ts` | planos, preços, hospedagem e portfólio (dado puro, testado) |
| `src/pricing/plans.test.ts` | invariantes do dado |
| `src/pages/PrecosPage.tsx` | a página `/precos` |
| `src/seo/routes.ts` + `vercel.json` | rota pré-renderizada `/precos` |
| `public/portfolio/precos/*.webp` | capturas reais 960×600 dos projetos |

---

## Slice 1 — Página `/precos` (sites) com holograma TENKA e portfólio

### Task 1.1: Capturas reais do portfólio

**Arquivos:** criar `public/portfolio/precos/{innovation,coliseu,coliseu-crm,freelandoo,enzo,ecoluz,ricardo}.webp`

- [x] Capturar cada site em 1440×900 por Chrome headless via CDP (esperar a animação de entrada, fechar modal), converter para webp 960 px qualidade 78 com `ffmpeg -vf scale=960:-1 -c:v libwebp -quality 78`.
- [x] Ricardo Fogões: o site no ar está **inativo** (tela "Site inativo"); usar `freelandoo/SITES/ricardo-fogoes/shots/desktop-home.png`.

### Task 1.2: Dado dos planos (TDD)

**Arquivos:** criar `src/pricing/plans.ts`, `src/pricing/plans.test.ts`

- [ ] **Passo 1 — teste que falha:**

```ts
import { describe, expect, it } from 'vitest';
import { HOSTING, PLANS, PORTFOLIO, formatBRL } from './plans';

describe('planos de site', () => {
  it('sobe de preço do Essencial ao Experiência', () => {
    expect(PLANS.map((p) => p.price)).toEqual([300, 650, 1000]);
  });
  it('destaca exatamente um plano', () => {
    expect(PLANS.filter((p) => p.featured)).toHaveLength(1);
  });
  it('formata em reais sem centavos', () => {
    expect(formatBRL(1000)).toBe('1.000');
    expect(HOSTING.monthly).toBe(60);
  });
  it('linka todo projeto do portfólio por https e tem captura local', () => {
    for (const item of PORTFOLIO) {
      expect(item.href.startsWith('https://'), item.id).toBe(true);
      expect(item.image).toBe(`/portfolio/precos/${item.id}.webp`);
    }
  });
});
```

- [ ] **Passo 2:** `npx vitest run src/pricing` → FALHA (módulo não existe).
- [ ] **Passo 3:** implementar `plans.ts` com `PLANS` (Essencial 300: landing estática, design personalizado, contato por WhatsApp · Premium 650 destacado: tudo do Essencial, animações suaves, interações na página, visual mais envolvente, experiência personalizada · Experiência 1000: tudo do Premium, elemento 3D simples, movimento em 3D, interações diferenciadas, experiência marcante, conceito visual exclusivo), `HOSTING` (60/mês, 24 h no ar, preparado para o Google), `PORTFOLIO` (7 projetos com `id`, `name`, `kind`, `href`, `image`, `division`) e `formatBRL` (`Intl.NumberFormat('pt-BR')`).
- [ ] **Passo 4:** `npx vitest run src/pricing` → PASSA.

### Task 1.3: Rota pré-renderizada

**Arquivos:** modificar `src/seo/routes.ts` (CORE_ROUTES), `vercel.json` (rewrites, antes do catch-all), `src/App.tsx`.

- [ ] Rota `/precos`: title ≤ 65, description 70–165, `ogImage: '/images/og/tenka-tech.jpg'`, `highlights` com os três planos e preços (o HTML estático leva os preços para crawler).
- [ ] Rewrite `{ "source": "/precos", "destination": "/precos/index.html" }`.
- [ ] `App.tsx`: `<Route path="/precos" element={<Suspense …><PrecosPage/></Suspense>}/>` com `lazyWithRetry` (o three fica fora do pacote principal).
- [ ] `npx vitest run src/seo` → PASSA (o teste "rewrite dedicado para cada rota" cobre o esquecimento).

### Task 1.4: Pele `tf-` e divisões

**Arquivos:** criar `src/tabloid/tabloid.css`, `src/tabloid/divisions.ts`.

- [ ] `divisions.ts`: `DIVISIONS = { tech: { name: 'TENKA Tech', acc: '#00D9E0', to: '/tech' }, studios: { …'#E0262F', '/studios' }, games: { …'#FF6A0A', '/games' } }`.
- [ ] `tabloid.css`: `.tf-root[data-division=…]` define `--tf-acc`; `.tf-grid`, `.tf-grunge`, `.tf-ribbon`, `.tf-mono`, `.tf-card`, `.tf-price`, `.tf-marquee`. Nenhum `border-radius`.

### Task 1.5: Holograma TENKA (padrão Coliseu3D)

**Arquivos:** criar `src/tabloid/hologram/{geometry.ts,scene.ts,TenkaHologram.tsx}`.

- [ ] `geometry.ts`: os polígonos do `TenkaSymbol` (contorno externo + 5 furos, viewBox 100) viram segmentos: contorno na face da frente e de trás (profundidade 14), arestas laterais em cada vértice, e 6 camadas intermediárias de contorno (o "fatiado" do holograma). Atributo `layer` (0–1, posição em z) para a construção.
- [ ] `scene.ts`: `WebGPURenderer` (cai para WebGL2 sozinho), `LineBasicNodeMaterial` com cor da divisão, construção da frente para trás em 2,2 s (`uRevelado` sobre `layer`), giro lento (1 volta/40 s, oscilação ±25°), inclinação com mola seguindo o ponteiro (±10°), varredura periódica, bloom TSL com a mesma saída despremultiplicada do Coliseu. Só desenha com a aba visível e a caixa na tela. Em movimento reduzido: um quadro pronto.
- [ ] `TenkaHologram.tsx`: SVG do símbolo em traço como fallback/primeiro paint; cena importada sob demanda quando a caixa aparece; crossfade.

### Task 1.6: Página `/precos`

**Arquivo:** criar `src/pages/PrecosPage.tsx` + `src/pricing/precos.css`.

Ordem da página:
1. Cabeçalho tabloide (marca TENKA Tech, divisões com suas cores, "Falar no WhatsApp").
2. Herói: holograma TENKA grande (paralaxe por scroll), faixa em seta "TABELA 2026 · SITES", título gasto "UM SITE À **ALTURA** DO SEU NEGÓCIO.", subtítulo.
3. Três cartões de preço (Premium elevado, com borda viva); contador do preço sobe ao entrar na tela; "Quero este" → WhatsApp com o nome do plano (`whatsappUrl`, `trackContactClick('whatsapp','precos-<plano>')`).
4. Faixa de hospedagem R$ 60/mês.
5. Portfólio: grade de cartões pequenos (captura P&B → cor no hover, inclinação 3D leve com o ponteiro, painel branco cortado com nome e tipo, "ABRIR ↗"), link direto em nova aba.
6. Letreiro corrido "SITES · SISTEMAS · 3D · GAMES" e CTA final com as três divisões nas suas cores.

- [ ] `npm run test` verde, `npm run build` verde (no worktree do commit), conferir `dist/precos/index.html` com os preços.
- [ ] Captura da página em 1440×900 e 390×844 pelo script CDP; conferir à vista.
- [ ] Commit `feat(precos): página de preços de sites no tabloide futurista com holograma TENKA` + push.

---

## Slice 2 — Cabeçalho e rodapé tabloide nas institucionais

**Arquivos:** modificar `src/components/site/SiteShell.tsx` para usar `TabloidHeader` e a pele `tf-` com `data-division` por página (`/sobre` e `/projetos` = grupo, neutro branco; `/contato` = tech). Acrescentar "Preços" ao menu e ao `FOOTER_LABELS`.
- [ ] Captura antes/depois de `/sobre`, `/projetos`, `/contato`; testes de SEO verdes; commit.

## Slice 3 — Home do grupo (`/`)

Herói tabloide com as três divisões como três colunas-manchete (cada uma na sua cor, título gasto, faixa em seta), holograma TENKA neutro no centro, letreiro de projetos em destaque (reaproveita `PORTFOLIO`), selo "● NO AR".
- [ ] `src/components/hero/*` mantém o `TenkaHero` atrás de flag até a QA; commit.

## Slice 4 — `/tech` (ciano)

Pele por fora da `TechBuildEngine`: cabeçalho tabloide, faixas de seção, cartões de portfólio `tf-card` no lugar dos atuais `TechLabs` de abertura, link "Ver preços" para `/precos`. O canvas persistente não muda.

## Slice 5 — `/studios` (vermelho)

Mesma pele sobre `CultureMachine`; holograma da marca na cor vermelha no fecho; cartões dos rótulos e hologramas.

## Slice 6 — `/games` (laranja)

Mesma pele sobre `WorldForge`; cartões do Jetpack, EVO e Arcade; holograma laranja no portal final.

## Slice 7 — páginas de serviço e "quanto custa"

`ServicePage` herda a pele da divisão dona da rota. **Decisão a registrar:** `src/seo/pricing.ts` diz "nenhum preço da TENKA é publicado aqui"; com `/precos` público, `/tech/sites/quanto-custa` passa a linkar `/precos` como a tabela de referência e o texto do topo é revisto para não contradizer a página.

---

## Autorrevisão

- Cobertura do pedido: preços de sites (1.2, 1.6), portfólio com capturas reais e link direto (1.1, 1.6), Freelandoo, Ricardo, Enzo, EcoLuz, Coliseu, Innovation Week (1.1), animação e paralaxe (1.6), logo TENKA 3D como o Coliseu (1.5), plano do site tabloide com as três cores (slices 2–7).
- Pendências do Alex: o site do Ricardo está inativo no ar (o cartão abre a tela "Site inativo"); o Enzo e a EcoLuz estão servidos pela Freelandoo, mas o domínio próprio da EcoLuz (`ecoluz.com.br`) não responde.
