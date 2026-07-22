# TENKA — Homepage Hero

Hero de página inicial em tela cheia apresentando as três divisões da TENKA
(Games, Multimídia, Desenvolvimento) como produtos digitais em um showroom,
com transições coordenadas por GSAP.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · GSAP + `@gsap/react` +
Observer · `lucide-react` · `react-router-dom`

## Rodando

```bash
npm install
npm run dev
```

## Rotas

| Rota               | Conteúdo                          |
| ------------------ | --------------------------------- |
| `/`                | Hero da homepage                  |
| `/admin/hero`      | Editor administrativo (protótipo) |
| `/games`           | Placeholder da divisão            |
| `/multimidia`      | Placeholder da divisão            |
| `/desenvolvimento` | Placeholder da divisão            |
| `/contato`         | Placeholder de contato            |
| `/painel/*`        | Área interna (login + Kanban de projetos) — ver [docs/PAINEL.md](docs/PAINEL.md) |

## Área interna (Painel)

O painel (`/painel`) tem autenticação real (Supabase Auth), Kanban de
projetos em post-its com drag and drop, observações, notificações e
gerenciamento de usuários com RLS no banco. Setup, primeiro administrador,
permissões e deploy: **[docs/PAINEL.md](docs/PAINEL.md)**.

```bash
npm test   # testes dos fluxos críticos do painel (Vitest)
```

## Conteúdo editável

O hero lê os slides através de `HeroSlidesRepository`
(`src/repositories/`). O protótipo persiste em `localStorage`
(chave `tenka:hero-slides`); uma futura `ApiHeroSlidesRepository`
(GET/PUT `/api/hero-slides`) substitui o armazenamento sem alterar
componentes. Enquanto um slide não tiver `imageUrl`, o screenshot é um
retângulo sólido (`placeholderColor`) — o rótulo de desenvolvimento é
controlado por `SHOW_PLACEHOLDER_LABELS` em `HeroScreenshotCard.tsx`.

⚠️ `/admin/hero` não tem autenticação neste protótipo — ver o comentário de
segurança em `src/pages/AdminHeroPage.tsx` antes de ir para produção.

## Navegação do hero

Setas, teclado (← →), roda do mouse/trackpad, swipe/drag (GSAP Observer),
clique nos cards de fundo, rótulos de divisão no header e indicadores
laterais. Autoplay a cada 7s com barra de progresso — pausa em hover, aba
oculta e interação; desativado com `prefers-reduced-motion` (transições
viram crossfade rápido, sem blur nem 3D).
