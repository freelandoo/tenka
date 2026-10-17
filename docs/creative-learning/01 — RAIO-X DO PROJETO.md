# Raio-X do Projeto — Innovation Week 2026

> Escopo da investigação: `innovation-week/` no monorepo TENKA, revisado em 17/10/2026. Este relatório descreve o que está no código local, não uma promessa de que todos os fluxos estejam publicados ou ativos em produção.

## Como ler este documento

- **Confirmado** — import, arquivo, função, asset ou teste encontrado.
- **Inferido** — conclusão técnica razoável a partir de evidências; marcada como tal.
- **Alternativa** — maneira viável de obter o mesmo resultado, mas não presente no projeto.

## Inventário executivo

| Área | Implementação confirmada | Por que faz sentido aqui |
|---|---|---|
| Landing narrativa | Vite + TypeScript sem framework, Three.js, HTML/CSS | Uma cena WebGL persistente acompanha seções de conteúdo sem o custo/abstração de uma SPA React. |
| Storytelling | Estado de cena interpolado pelo scroll em `src/story/Director.ts` | A narrativa controla objeto, portal, astronauta e partículas como uma única coreografia responsiva. |
| Rótulo digital | `DigitalLabelTwin`, texturas e shaders GLSL | Permite revelar acabamentos de impressão sem enviar um modelo 3D pesado do pote. |
| RA | MindAR 1.2.5 local + câmera + Three.js | Anexa o astronauta ao rótulo impresso; há prévia 3D quando a câmera/rastreamento falha. |
| Jogo | Three.js + simulação pura determinística | É um endless runner 3D vertical; separar regras do render permite testar a jogabilidade. |
| Coleção | GLTF/GLB, `CharacterViewer` e `SlotTurntable` | Reaproveita o modelo do astronauta como recompensa e objeto interativo. |
| Apresentação/telão | HTML multipágina, Three.js e GSAP | O mesmo universo visual vira palco de evento e painel de dados ao vivo. |
| Dados | Hono + Postgres + `pg`, migrations e PGlite em testes | Persiste scans, eventos, cadastros, coleção, partidas e ranking sem acoplar o front à base. |

O front possui 81 arquivos TypeScript em `innovation-week/frontend/src`; o backend possui 9 em `innovation-week/backend/src`. Assets relevantes incluem modelos `astronaut-rig.glb` e `spacesuit.glb`, variante iOS `spacesuit.usdz`, destino MindAR `label.mind`, 30 imagens WebP e a biblioteca MindAR empacotada localmente.

## Arquitetura e percurso do visitante

```text
QR/URL GS1 ou leitor de câmera
  -> identity/resolver + identity/session
  -> landing WebGL (Stage + Director + Label/Portal/Astronaut)
  -> scan/eventos na API
  -> rótulo reconhecido -> ativação/cadastro -> área do membro
  -> RA com rastreamento de imagem -> coletável
  -> coleção / jogo / ranking
```

O app é multipágina: `index.html`, `jogo.html`, `membro.html`, `ranking.html`, `telao.html`, `admin.html`, `apresentacao.html` e `privacidade.html`. O build estático é incorporado ao deploy principal da TENKA sob `/innovation-week/`; `src/base.ts` evita quebrar rotas e assets quando essa base muda. Isso é **confirmado** no `README.md` do front, em `vite.config.ts` e no plano `docs/superpowers/specs/2026-10-14-innovation-week-na-tenka-design.md`.

## Dependências confirmadas

| Item | Tipo | Evidência | Uso real |
|---|---|---|---|
| TypeScript 6 + Vite 8 | linguagem/build | `frontend/package.json` | Compilação, typecheck e build estático. |
| Three.js 0.186 | biblioteca 3D/WebGL | `frontend/package.json` e imports em `src/scene`, `src/ar`, `src/game`, `src/collection` | Cenas, câmera, GLTF, shaders, partículas, pós-processamento. |
| GSAP 3.15 | biblioteca de animação | `frontend/package.json`, `src/present/slides.ts`, `src/admin/main.ts` | Contadores, entradas e microtransições de apresentação/admin. Não há import de ScrollTrigger. |
| jsQR | biblioteca de leitura QR | `frontend/package.json`, `src/scanner/qrWorker.ts` | Fallback em worker para navegadores sem `BarcodeDetector`. |
| qrcode-generator | biblioteca QR | `frontend/package.json`, `src/ui/*` | Geração/uso visual de QR. |
| MindAR 1.2.5 | biblioteca de visão computacional/AR | `public/ar/mindar/*`, `src/ar/modes.ts`, `README.md` | Rastreamento de imagens compiladas em `label.mind`. |
| Hono + `@hono/node-server` | framework/API HTTP | `backend/package.json`, `backend/src/app.ts` | Rotas, CORS, rate limit e respostas JSON. |
| PostgreSQL via `pg` | banco/driver | `backend/package.json`, `backend/src/db.ts`, migrations | Dados de jornada, credenciais administrativas, ranking e retornos. |
| PGlite | dependência de testes | `backend/package.json`, `backend/tests/*` | Testa a API com Postgres em WASM sem servidor externo. |

Não há React, React Three Fiber, Phaser, WebGPU renderer, WebXR API, Unity, Unreal ou serviço de IA importados por `innovation-week`. São alternativas ou conhecimentos futuros, nunca fatos deste projeto.

## Experiências e módulos

### 1. Landing: produto físico como portal narrativo

| Campo | Ficha |
|---|---|
| Experiência | Página iniciada por um QR único; apresenta rótulo, acabamento, identidade e convite à RA. |
| Resultado visual | Canvas 3D de fundo com rótulo, portal energético, astronauta e partículas; conteúdo HTML segue sobre a cena. |
| Funcionamento | `main.ts` cria uma única `Stage`, adiciona objetos atualizáveis e inicia `Director`. A rolagem é convertida em estado de cena suavizado. |
| Implementação | `frontend/src/main.ts`, `scene/Stage.ts`, `story/Director.ts`, `scene/{EnergyPortal,ParticleField,Astronaut}.ts`, `ui/sections.ts`. |
| Tecnologias | TypeScript, DOM/CSS, Three.js, WebGL2; sem GSAP para a coreografia principal. |
| Conhecimentos | Loop de render, cena/câmera/mesh/material, espaço de tela vs. mundo, scroll, interpolação e acessibilidade de movimento. |
| Dificuldade | Intermediária para reproduzir; avançada para dirigir a cena inteira. |
| Reprodução | Criar uma cena simples persistente, definir estados por seção (`x`, `y`, escala, opacidade), interpolar e só então adicionar assets. |
| Alternativas | GSAP ScrollTrigger, Motion One + CSS, canvas 2D; úteis para narrativas mais simples. |
| Potencial criativo | Linha do tempo de produto, museu digital, manual interativo, lançamento de coleção ou manifesto de marca. |

Decisão notável: `Director.measure()` mede o DOM e transforma retângulos em posições do mundo. **Confirmado**: é por isso que o objeto 3D parece pousar perto de cards mesmo ao trocar de viewport; não é uma coordenada fixa em pixels.

### 2. Digital twin do rótulo e acabamentos

| Campo | Ficha |
|---|---|
| Experiência | Um rótulo plano vira objeto explicável: textura, relevo, holografia, luminescência e fotoluminescência aparecem por camadas. |
| Resultado visual | Scanline, iluminação que acompanha ponteiro, layers afastadas e máscara por acabamento. |
| Funcionamento | A arte base e máscaras WebP são carregadas em ordem; `ShaderMaterial` usa UVs, uniformes de luz/tempo e máscaras para compor cada superfície. |
| Implementação | `src/label/DigitalLabelTwin.ts`, `labelShaders.ts`, `labelConfig.ts`, `scripts/build_label_assets.py`; assets em `public/innovation-week/label/`. |
| Tecnologias | Three.js, GLSL, `TextureLoader`, UV mapping, WebP/AVIF/JPG. |
| Conhecimentos | Textura/UV, fragment shader, alpha/blending, espaço local, fallback 2D. |
| Dificuldade | Avançada. |
| Reprodução | Começar com um plano com textura; acrescentar máscara P&B; depois Fresnel/ruído/scanline e, por último, pilha de layers. |
| Alternativas | SVG/CSS masks para efeitos 2D; shader em React Three Fiber se o projeto já for React. |
| Potencial criativo | Cartaz com tinta reativa, cartão colecionável, inspeção de materiais, embalagem explicável. |

### 3. Realidade aumentada por imagem

| Campo | Ficha |
|---|---|
| Experiência | Ao apontar a câmera para o rótulo, o astronauta aparece ancorado; pode ser materializado, capturado e compartilhado. |
| Resultado visual | Vídeo de câmera em tela cheia, moldura de busca, holograma com Fresnel/scanline/glitch e estado de coleção. |
| Funcionamento | `ImageTrackingMode.start()` pede câmera traseira, carrega MindAR e `label.mind`; matrizes retornadas pelo rastreador atualizam um `THREE.Group`-âncora. Se falhar, `PreviewMode` mostra modelo 3D manipulável; iOS recebe USDZ/Quick Look e Android recebe Scene Viewer. |
| Implementação | `src/ar/{ArExperience,modes,hologram,launch}.ts`, `public/ar/label.mind`, `public/models/{spacesuit.glb,spacesuit.usdz}`. |
| Tecnologias | `getUserMedia`, vídeo, MindAR, Three.js, GLTFLoader, Web Share quando disponível. |
| Conhecimentos | Permissão de câmera/HTTPS, pose 3D, matrizes, rastreamento natural de imagem, fallback e descarte de MediaStream. |
| Dificuldade | Avançada. |
| Reprodução | Primeiro uma prévia GLB sem câmera; depois detector de marcador; depois imagem compilada e UX de perda de tracking. |
| Alternativas | AR.js para marcadores, 8th Wall/Niantic Studio ou Zappar (avaliar custo/licença); WebXR para dispositivos que o suportem. |
| Potencial criativo | Personagem em embalagem, instrução técnica sobre peça física, filtro de lançamento, experiência de varejo. |

**Precisão importante:** há RA de rastreamento de imagem; não há evidência de ancoragem espacial/plane detection/WebXR no código. O arquivo `src/perf/tier.ts` detecta a presença de WebGPU, mas continua usando `WebGLRenderer`.

### 4. Ativação, QR, membro e coleção

| Campo | Ficha |
|---|---|
| Experiência | QR identifica uma unidade, habilita cadastro, área pessoal e personagem coletável. |
| Resultado visual | CTA de câmera, modal de ativação, vitrine/turntable e perfil de tripulante. |
| Funcionamento | `UnitScanner` usa `BarcodeDetector` quando existe e worker jsQR de fallback; o resolvedor normaliza Digital Link/GS1. A API confere a unidade contra `registry_units`; a coleção é registrada após o fluxo de RA. |
| Implementação | `src/scanner/*`, `identity/{resolver,session}.ts`, `ui/{activation,unitScanCta}.ts`, `member/*`, `collection/{CharacterViewer,SlotTurntable,catalog,model}.ts`; API em `backend/src/app.ts`. |
| Tecnologias | MediaDevices, Web Worker, jsQR, local/session storage, GLTFLoader, Hono/Postgres. |
| Conhecimentos | Parsing seguro, estados assíncronos, dados pessoais/consentimento, autenticação por token, gestão de recursos 3D. |
| Dificuldade | Intermediária a avançada. |
| Reprodução | Fazer leitor de QR local; persistir somente ID; simular catálogo local; só depois incluir back-end e cadastro. |
| Alternativas | Scanner nativo somente, PWA, login por e-mail/magic link; não necessários aqui. |
| Potencial criativo | Passaporte de evento, colecionáveis de campanha, trilha de produto físico-digital. |

### 5. Astronaut Jetpack: jogo e gamificação

| Campo | Ficha |
|---|---|
| Experiência | Endless runner 3D vertical 9:16; segurar ativa jetpack, soltar deixa cair; há combustível, obstáculos, poder Vulcan e ranking. |
| Resultado visual | Cabine espacial, trilhos, neon/bloom, planeta, partículas, astronauta riggado e feedback de impacto. |
| Funcionamento | `World` em `src/game/sim/world.ts` roda passo fixo de 1/120 s; `Generator` recebe seed e só cria trajetórias/cápsulas alcançáveis; `main.ts` interpola simulação e render, trata input, áudio e estados. O backend sorteia seed e limita distância pelo tempo para reduzir fraude. |
| Implementação | `src/game/{main,input,audio,api}.ts`, `sim/{world,generator,difficulty,tuning,rng}.ts`, `render/*`, `tests/game.test.ts`; rotas em `backend/src/app.ts`. |
| Tecnologias | Three.js, EffectComposer/UnrealBloomPass, ShaderMaterial, Web Audio, Gamepad API, Postgres. |
| Conhecimentos | Game loop, delta/fixed timestep, máquina de estados, colisão AABB, seed/RNG, interpolação, pool de objetos, game feel e anti-cheat pragmático. |
| Dificuldade | Avançada. |
| Reprodução | Fazer versão 2D sem rede; escrever simulação testável; introduzir gerador seguro; migrar render para 3D e ranking por último. |
| Alternativas | Phaser para jogo 2D; Godot/Unity para distribuição nativa; Rapier para física mais geral. |
| Potencial criativo | Jogo de evento, treinamento gamificado, caça a colecionáveis, interação em estande. |

O ponto mais didático é `Generator.placeFuel()`: não “espalha itens aleatoriamente”; calcula se ida e saída da cápsula cabem na mobilidade do jogador. Isso é uma decisão de **game design formalizada no código**, não só um efeito visual.

### 6. Apresentação, telão e operação ao vivo

| Campo | Ficha |
|---|---|
| Experiência | Roteiro visual para apresentar o projeto, telão de evento e painel administrativo de métricas/operação. |
| Resultado visual | Slides de alto contraste, objetos 3D sincronizados, números animados, dados ao vivo, pódio e ranking. |
| Funcionamento | `present/main.ts` troca slides e delega estados de cena a `present/slides.ts`; hooks usam GSAP para contadores. `admin/main.ts` autentica, consulta métricas e atualiza a cada 10 s; ranking atualiza a cada 30 s. |
| Implementação | `src/present/*`, `src/screen/*`, `src/admin/*`, `src/ranking/main.ts`, `backend/src/app.ts` (`/api/live`, `/api/stats`, rotas admin). |
| Tecnologias | DOM/CSS, GSAP, Three.js, `fetch`, Hono/Postgres. |
| Conhecimentos | Design de informação, estado de apresentação, polling, autenticação, rate limiting e eventual consistência visual. |
| Dificuldade | Intermediária. |
| Reprodução | Criar 5 slides estáticos; acrescentar um estado de cena; conectar dados mockados; integrar API e autenticação ao final. |
| Alternativas | Reveal.js, PowerPoint/Keynote, websockets/SSE para atualização instantânea. |
| Potencial criativo | Keynote de produto, painel de missão, placar de palco, venda consultiva imersiva. |

## Dados, proteção e limites operacionais

- **Confirmado:** `backend/migrations/001_init.sql` grava unidades, sessões e eventos; `003_signups.sql` adiciona dados pessoais somente no cadastro com consentimento.
- **Confirmado:** `backend/src/app.ts` valida entradas, aplica limite de corpo e rate limiting, restringe admin por token/sessão e valida distância possível antes de ranquear uma partida.
- **Confirmado:** o cliente envia telemetria com `sendBeacon` quando possível e continua funcional sem API (`src/api/client.ts`).
- **Inferido:** a arquitetura prioriza resiliência de estande/QR: experiência principal e recorde local sobrevivem a falhas de rede.
- **Não concluível pelo repositório:** situação real de LGPD, consentimento operacional, retenção, Railway, Vercel, DNS e listas da Realizse. Isso exigiria inspeção de produção e base.

## Performance e responsividade

| Técnica | Evidência | Intenção |
|---|---|---|
| Perfil high/medium/low | `src/perf/tier.ts` | Sem WebGL2: fallback CSS; com hardware limitado: menos partículas/DPR menor. |
| DPR adaptativo | `scene/Stage.ts#adaptDpr` | Diminui resolução depois de frames lentos. |
| Assets sob demanda | `ar/modes.ts#loadMindAr`, `ArExperience` | MindAR/targets são baixados apenas ao abrir RA. |
| Pausa/liberação de canvas | `main.ts#releaseLanding` | Modal móvel pode reduzir canvas a 1×1 para liberar memória de GPU. |
| Pools/instancing | `game/render/{obstacles,environment}.ts` | Reuso de objetos e `InstancedMesh` reduz alocação/draw calls. |
| Bloom adaptativo | `game/render/stage.ts#watchFps` | Pós-processamento desliga abaixo de 40 FPS. |
| Movimento reduzido | `perf/tier.ts`, múltiplos módulos | Respeita `prefers-reduced-motion` e `?reduced`. |

## Histórico que explica a evolução

O Git mostra importação do projeto em `24992cb` (14/10/2026), adaptação à base `/innovation-week/` em `f43dbb2`, inclusão do fliperama em `d9a326c` e evolução do ranking/pódio/encerramento entre `ff8bce0` e `2afe7f4` (15/10/2026). Isso confirma evolução incremental do produto; não prova o processo criativo inicial ou autoria individual de cada ideia.

## O que não foi visualmente verificado nesta etapa

Foram inspecionados código, assets, documentação e histórico. Ainda é necessário abrir o front com câmera real para confirmar qualidade de tracking, FPS por aparelho, áudio, aparência de shaders e APIs publicadas. Os comandos de verificação recomendados estão no roadmap e no README do front.
