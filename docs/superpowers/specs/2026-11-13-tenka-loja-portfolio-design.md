# TENKA 2.0 — vitrine, loja, portfólio vivo e games

Data: 2026-11-13 · Status: **rascunho para aprovação do Alex**

## Ponto de partida (o que já existe)

- Monorepo `TENKA/` (`freelandoo/tenka`, branch `master`): **front Vite + React 19** (SPA com
  pré-render por rota via `scripts/seo-plugin.ts`, deploy Vercel `tenka`) e **back Fastify + Postgres**
  (Railway, 37 migrations, auth própria JWT, SSE).
- Já instalados: three 0.185, R3F 9, drei 10, postprocessing, GSAP 3.13, Lenis, motion.
- Fundo WebGL **"Digital Fabric"** (`components/animated-background/`) — partículas, grade, ponteiro,
  nível por aparelho — hoje só na página Tech.
- `/precos` com preço fixo: Essencial R$ 300 · Premium R$ 650 · Experiência R$ 1.000 · hospedagem R$ 60/mês.
- **Portal do cliente** `/painel/portal` (visão geral, projetos, suporte).
- **Asaas** integrado (≈ 6.900 linhas, 23 arquivos back, 21 front, 17 migrations) — **nenhum cliente real**.
- Innovation Week (`/innovation-week`): jogo do astronauta jogável, RA e colecionáveis já no ar.

## Decisões do Alex (13/11)

| Tema | Decisão |
|---|---|
| Gateway | **Desligar o Asaas e passar tudo para o Mercado Pago.** |
| Conta MP | **A mesma da Freelandoo** (código reaproveitado, mesma conta). |
| Parcelas de projeto | **Cartão parcelado no checkout MP.** Pix recorrente só se o MP oferecer (Pix Automático); senão, não. |
| Carrinho | **Preço fixo + sinal**: GMN e os 3 sites saem com preço cheio; games, sistemas, AR e VR têm card "a partir de" + sinal de briefing, o resto vai para orçamento. |
| Membros | **Estender o portal atual.** |
| Ordem | **Visual + portfólio vivo primeiro**, depois loja e pagamento. |
| GMN | Avulso **R$ 39,90/mês** + taxa de configuração; junto do site a mensalidade vira **R$ 99,90** (60 + GMN). Entrega: relatório mensal no portal, posts e fotos, resposta a avaliações. |
| Partículas | **No site todo** (fora do painel). |
| Cards | **3D vivo num canvas só** (drei `View`); celular = vídeo em loop. |
| Games | Páginas de construção de **tudo**: Meu Mundo, Cat demon, minijogos, armas e espadas — com **modelos sem textura em holograma**; o **astronauta jogável** ali; seção de **colecionáveis em RA**. |

## Arquitetura

### 1. Visual (frente V)
- **`SiteFabric`**: promove o Digital Fabric a camada global — um `<Canvas>` fixo no layout público,
  montado uma vez, que troca de **forma por rota/seção** (partículas que se reorganizam: logo TENKA →
  globo → grade → silhueta do produto) e reage ao mouse (repulsão + brilho). O painel não monta.
- Nível de qualidade pelo `useDeviceCapability` já existente; `prefers-reduced-motion` = campo parado;
  aba oculta = pausa.
- **Transições de rota**: cortina/scanline com GSAP + `motion` `AnimatePresence`; Lenis no scroll.
- Holograma reutilizável (`HoloModel`): shader fresnel + scanlines + ruído para GLBs **sem textura** —
  serve aos games, às páginas de construção e aos cards da loja.

### 2. Portfólio vivo — páginas de construção (frente P)
- Rota `/projetos/:slug` (pré-renderizada). Conteúdo em `src/cases/<slug>.ts` (dado tipado, sem CMS).
- Modelo de página: capa (site ao vivo em mockup de navegador) → **Planejamento** → **Etapas** (linha
  do tempo com commits reais e prints) → **Técnicas e bibliotecas** (chips com o porquê) → **Números**
  (Lighthouse, peso, triângulos) → CTA "quero um assim".
- Casos: GS, Hidrovap, Excelência, RH Climatização, VivaAr, Freelandoo, Coliseu (CRM), Innovation Week.
- Fonte: git log, docs e memória de cada projeto; prints por Playwright nos sites no ar.

### 3. Games (frente G)
- `/games/construcao/<slug>`: Meu Mundo 3D, Cat demon, minijogos do Meu Mundo, arsenal (armas/espadas).
- Modelos GLB **sem textura** exibidos no `HoloModel` (otimizados com gltfpack; nada de build jogável
  do Meu Mundo nem do Cat demon — só modelo, vídeo e técnica).
- **Astronauta**: card "jogue agora" que abre `/innovation-week/jogo` (já no ar).
- **Colecionáveis RA**: vitrine do catálogo de `innovation-week/frontend/src/collection`.
- Exceção explícita do Alex à regra "jogos fora de produção não publicam": vale para páginas de
  construção e modelos; builds jogáveis desses jogos continuam fora.

### 4. Loja + carrinho (frente L)
- Catálogo em tabela `products` (back): `kind` (`fixed` | `subscription` | `deposit`), preço em
  centavos, intervalo, `addons` (ex.: GMN junto do site → mensalidade 99,90).
- `/loja` com cards 3D (um canvas, drei `View`), `/loja/:slug` com o 3D grande.
- Carrinho no front (localStorage) → `POST /checkout` cria **pedido** no back e devolve o link MP.
  Preço **sempre recalculado no servidor**.
- Assinatura (GMN, hospedagem) = `preapproval` do MP; avulso/sinal = `preference` com parcelas no cartão.

### 5. Pagamento — troca Asaas → MP (frente $)
- Porta para TS o adaptador da Freelandoo (`integrations/payments/providers/mercadopago.js`,
  `mercadoPagoClient.js`, `MercadoPagoWebhookService.js`, `PaymentReconciliationService.js`),
  com as regras do `pagamentos.md`: reais com decimal, webhook com assinatura do manifesto, 503 sem
  segredo, confirmação idempotente, fulfill + expire + refund juntos.
- `external_reference` = `tenka:<order_id>`; `notification_url` por cobrança aponta ao back da TENKA.
- **Mesma conta MP**: aviso de assinatura (`preapproval`) vai ao webhook do app = o da Freelandoo.
  Fatia na Freelandoo: o webhook reconhece `tenka:` e **repassa** ao back da TENKA (assinado), sem
  tocar em nada da Freelandoo.
- Mantém do financeiro atual o que é do domínio (projetos, plano, parcelas, fila, conciliação) e troca
  só o provedor; depois remove o código e as variáveis do Asaas (migration nova marca as colunas
  `asaas_*` como legado — migration aplicada não se edita).

### 6. Área de membros (frente M)
- Compra cria/vincula **cliente** + usuário do portal (convite por e-mail para definir a senha).
- Portal ganha: **Pedidos**, **Assinaturas** (cancelar no fim do ciclo), **Relatório GMN** mensal
  (buscas, cliques, ligações, rotas + Search Console/Analytics — lançado pela equipe no começo, API
  do Google depois).

### 7. SEO de conteúdo — páginas-resposta (frente S)
Pedido do Alex (13/11): muitas páginas, cada uma respondendo **uma pergunta real** que o cliente
pesquisa, montadas para SEO.
- Base existente: `seo/routes.ts`, `seo/schema.ts`, `crawlable.test.ts`, páginas `/…/quanto-custa`,
  pré-render do `scripts/seo-plugin.ts` e os **clusters A–F** de `docs/AUDITORIA-SEO-CRO.md` §4
  (VR/NRs, maquete/3D, branding, sites/sistemas, games/ativações, marca).
- Conteúdo como dado tipado em `src/content/perguntas/*.ts`, no padrão do
  `SITES/rh-climatizacao/lib/content/`: `slug`, palavra-chave principal, `title` (≤ 62) e `description`
  (90–165) únicos, `h1`, resposta direta no 1º parágrafo, blocos, FAQ, links internos obrigatórios
  (≥ 1 produto da loja + ≥ 1 página de construção + o pilar do cluster).
- Rotas: pilar por tema (`/guias/<tema>`) + perguntas (`/guias/<tema>/<pergunta>`), pré-renderizadas,
  no `vercel.json` e no sitemap; JSON-LD `FAQPage` + `BreadcrumbList` + `Article`.
- Temas iniciais: quanto custa um site; como aparecer no Google; Google Meu Negócio; advergame e
  gamificação; AR e VR para empresas (treinamento NR, ativação); sistemas sob medida e automação com IA;
  maquete/mockup 3D.
- **Teste de conteúdo** (cópia do `tests/content.test.ts` da RH): títulos/descrições/h1 únicos e no
  tamanho, **anti-doorway** (shingles de 5 palavras < 8 % entre páginas), **promessa não confirmada**
  barrada (prazos, "melhor", "mais barato", % de resultado, nº de clientes), todo link interno resolve
  para rota existente.
- Preço citado vem de `pricing/plans.ts` / catálogo, nunca escrito à mão no texto.

## Fatias (ordem de entrega)

Cada fatia = commit + push em `master`, deploy pela API da Vercel (nunca CLI), conferência no ar.

| # | Fatia | Pronto quando |
|---|---|---|
| V1 | `SiteFabric` global + qualidade/reduced-motion | partículas em todas as páginas públicas, 60 fps no desktop, painel limpo |
| V2 | Formas por rota + hover (logo, globo, grade) | troca de forma ao navegar, repulsão no mouse |
| V3 | Transições de rota + Lenis global | cortina entre páginas sem pulo de layout |
| V4 | `HoloModel` (holograma de GLB sem textura) | componente usado numa página de teste |
| P1 | Rota `/projetos/:slug` + modelo de página + 1º caso (GS) | página no ar e pré-renderizada |
| P2 | Hidrovap, Excelência, RH, VivaAr | 4 páginas no ar |
| P3 | Freelandoo e Coliseu | 2 páginas no ar |
| G1 | Construção do Meu Mundo (holo + vídeos + técnica) | página no ar, nenhum build jogável |
| G2 | Cat demon, minijogos, arsenal | 3 páginas no ar |
| G3 | Astronauta jogável + colecionáveis RA na vitrine Games | link e catálogo no ar |
| $1 | Adaptador MP em TS + webhook + pedidos (migration) | cobrança de R$ 1 paga e confirmada em produção |
| $2 | Repasse `tenka:` no webhook da Freelandoo | assinatura de teste confirmada no back da TENKA |
| $3 | Financeiro de projeto passa a cobrar pelo MP | painel admin emite cobrança MP de etapa |
| $4 | Remove Asaas (código, env, telas) | build sem `asaas`, testes verdes |
| L1 | Catálogo `products` + `/loja` com cards 3D | loja no ar sem checkout |
| L2 | Carrinho + `POST /checkout` + compra do GMN | GMN comprado ponta a ponta |
| L3 | Sites com add-on GMN (99,90) e sinais de games/AR/VR/sistemas | todos os produtos compráveis |
| M1 | Convite do comprador + Pedidos/Assinaturas no portal | cliente vê e cancela a assinatura |
| M2 | Relatório GMN mensal no portal | relatório lançado e visível |
| S1 | Modelo de página-resposta + teste de conteúdo + JSON-LD + sitemap; pilar "sites" com 3 perguntas | 4 páginas no ar, teste verde, no sitemap |
| S2 | Google Meu Negócio e "como aparecer no Google" (pilar + 4 perguntas) | linkam o produto GMN da loja |
| S3 | Games/advergame e AR/VR (pilar + 4 cada) | linkam as páginas de construção de games |
| S4 | Sistemas/IA e 3D/maquete (pilar + 3 cada) | teste anti-doorway verde com todas |
| X  | Pix Automático no MP: conferir na documentação; entra só se existir | decisão registrada |

## Riscos
- **Webhook compartilhado** (mesma conta MP): se o repasse falhar, a TENKA não fica sabendo de uma
  assinatura paga → conciliação periódica pela API do MP (`/preapproval/search` por `tenka:`) cobre.
- **Peso**: um canvas global + cards 3D; orçamento por nível, `View` em vez de vários contextos.
- **Pré-render**: rotas novas precisam entrar no `seo-plugin` e no `vercel.json`.

## Trabalho em paralelo (achado em 13/11, depois da aprovação)
- Outro autor ("PJ Codeworks") fez 17 commits entre 10 e 13/11: financeiro **em cima do Asaas**
  (serviços recorrentes, cobrança consolidada, portal de autorização de cartão com token do Asaas —
  `docs/PORTAL-AUTORIZACAO-CARTAO.md`) e rascunho de guias SEO (`seo-drafts/lote2-…md`, propõe `/guias/<slug>`).
- Consequências: a frente **$ fica parada** até o Alex alinhar com esse autor (trocar o provedor apaga
  o trabalho dele); a frente **S usa `/guias/<slug>`** (não `/guia/`) e aproveita o lote 2 como rascunho.

## Em aberto
- **Taxa de configuração do GMN avulso** (valor). Proposta: cobrada só no avulso; junto do site, sem taxa.
- Valores dos **sinais** de games, sistemas, AR e VR.

## Frente H — hero vitrine e trabalhos reais (pedido do Alex, 13/11)

**Pedido:** trocar o hero de todas as páginas por uma vitrine de cards — o maior na frente, os
outros atrás e um pouco de lado — com os projetos online renderizados, borda transparente e
"VISITAR" embaixo; fundo do hero = o trabalho mais relevante do tópico. Todo mockup sai e entra
trabalho real (Studios e Games principalmente).

**Inventário do que é mockup hoje:** `tech/data/projects.ts` (FINLAND, GYM CONTROL, FLOW CRM,
BOOK NOW, DATA VIEW — "Fake production URL"), `multimedia/data/projects.ts` (PULSE SOCIAL,
NIGHT SHIFT… — "placeholder"), `games/data/projects.ts` (Eclipse Primordial, Fronteira
Silenciada, Corações de Ferro — universos inventados).

**Trabalhos reais por divisão (lista do Alex):**
- **Tech:** os sites de cliente (GS, Hidrovap, Excelência, RH, VivaAr, EcoLuz, Enzo, Ricardo…),
  a Freelandoo e o sistema Coliseu.
- **Studios:** RA (Innovation Week), coleção da Casa Views, embalagem/rótulo da Innovation,
  apresentações (Innovation e Casa Views), criação de personagens.
- **Games:** o Meu Mundo (com criação de personagens), os dois jogos (EVO/Cat demon e o
  Astronauta Jetpack), os minijogos do Meu Mundo e a comunidade games da Freelandoo.

**Arquitetura:**
- `src/works/` — catálogo único de trabalhos reais (divisão, tópicos, link no ar, página de
  bastidores, pôster, vídeo, se aceita iframe). Alimenta heros, hubs, serviços e /projetos.
- `ShowroomHero` — palco em perspectiva: card da frente com o projeto **ao vivo** (iframe só
  no da frente e só no desktop; o resto pôster/vídeo — mesma regra do hero da home), cards de
  trás deslocados e girados; clicar num de trás traz para a frente (GSAP). Embaixo de cada card,
  pílula de borda transparente "VISITAR ↗" (site no ar; o que não é público vai para os
  bastidores). Fundo: pôster/vídeo do trabalho mais relevante, escurecido; partículas por cima.
- O que não está público (Meu Mundo, EVO) entra só com print/vídeo e leva aos bastidores —
  nunca build jogável (exceção: o Astronauta, que já é jogável em /innovation-week/jogo).

**Fatias:**
| # | Fatia | Pronto quando |
|---|---|---|
| H0 | Catálogo `src/works` + `ShowroomHero` | componente numa página de teste, iframe só na frente |
| H1 | Hub Tech: hero vitrine + portfólio real (sai FINLAND & cia.) | /tech sem mockup |
| H2 | Hub Studios: RA, Casa Views, Innovation, apresentações, personagens | /studios sem mockup |
| H3 | Hub Games: Meu Mundo, EVO, Astronauta, minijogos, comunidade | /games sem universo inventado |
| H4 | 16 páginas de serviço com a vitrine filtrada pelo tópico | todas com hero vitrine |
