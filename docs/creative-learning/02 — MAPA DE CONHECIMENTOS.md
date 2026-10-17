# Mapa de Conhecimentos — do código à autonomia criativa

Este mapa não transforma toda ferramenta possível em obrigação. A ordem foi derivada do que a Innovation Week realmente exige: primeiro programar movimento e sistemas confiáveis; depois desenhar com pixels/3D; por fim escolher ferramentas e criar repertório.

## Árvore de competências

```text
Creative developer para experiências web
├─ Fundamentos essenciais
│  ├─ JavaScript/TypeScript: estado, eventos, módulos, async
│  ├─ Navegador: DOM/CSS, canvas, media, storage, permissões
│  ├─ Matemática visual: vetores, trigonometria, interpolação, coordenadas
│  ├─ Performance e acessibilidade: frame budget, DPR, fallback, reduced-motion
│  └─ Arquitetura: separar regras puras, render e integração externa
├─ Movimento e narrativa
│  ├─ Timing, easing, timeline, atenção e hierarquia
│  ├─ Estados de cena e transições
│  └─ Áudio, feedback, input e microinteração
├─ 3D e shaders
│  ├─ Cena, câmera, luz, geometria, material e textura
│  ├─ glTF/GLB, rig e animação
│  ├─ WebGL, buffers, instancing e pós-processamento
│  └─ GLSL, UV, máscaras e blending
├─ Experiências de sistema
│  ├─ QR/câmera/visão computacional
│  ├─ Jogo: loop, estados, colisão, RNG e balanceamento
│  └─ API, dados, segurança e observabilidade
└─ Direção criativa autoral
   ├─ Referência -> princípio -> hipótese -> protótipo
   ├─ Arte/UX/storytelling
   └─ IA como pesquisa, crítica, rascunho e teste — nunca autoridade final
```

## O que é essencial, importante e opcional

| Prioridade | Aprenda | Razão ligada ao projeto |
|---|---|---|
| Essencial | TypeScript aplicado, DOM/CSS, `requestAnimationFrame`, eventos, estados e async | Tudo parte disso: `main.ts`, scanner, UI, jogo e API. |
| Essencial | Vetores, ângulos, interpolação/easing, espaços de coordenada | `Director.ts`, câmera, posições de modelos e game loop dependem disso. |
| Essencial | Three.js fundamental (scene, camera, geometry, material, render loop) | É a principal biblioteca gráfica existente. |
| Essencial | Performance web e fallback | `perf/tier.ts`, DPR adaptativo e modo low provam que “efeito bonito” sem degradação não basta. |
| Importante | GLSL/UV/texturas | Necessário para compreender o rótulo e holograma, não para começar em 3D. |
| Importante | Lógica de jogo e testes de regras | Simulação, seed e gerador seguro tornam o jogo sustentável. |
| Importante | Câmera, QR e visão computacional | Necessário para experiências físico-digitais como esta. |
| Importante | API/Postgres/segurança básica | Ranking, ativação e painel dependem disso. |
| Explorar depois | React Three Fiber | Ótimo se a próxima experiência nasce em React, mas a Innovation Week é Three.js imperativo. |
| Explorar depois | WebXR, WebGPU, Rapier, Phaser | São alternativas situacionais; não há uso confirmado aqui. |
| Explorar depois | Blender avançado, Substance, motion capture | Aceleram produção de assets, porém só depois de dominar consumo/otimização de GLB. |

## Fichas de competências

Cada ficha responde: o que é, para que serve, problema que resolve, motivo de escolha, ligação com a Innovation Week, pré-requisito, nível, prática, possibilidades e uso responsável de IA.

### TypeScript, módulos e estado orientado a eventos

| Questão | Resposta |
|---|---|
| O que é / serve para | JavaScript com tipos estáticos opcionais; estrutura dados, contratos e módulos. |
| Problema / escolha | Reduz erros ao coordenar muitos estados (`PageState`, `SceneState`, `GameEvent`) e permite refatorar sem perder rastreabilidade. |
| No projeto | Confirmado em todo `frontend/src`; o jogo declara estados em `game/main.ts`, a cena em `story/Director.ts`. |
| Estude antes | JavaScript, objetos, arrays, funções, `Promise`, eventos do navegador. |
| Domínio necessário | Intermediário: modelar estados finitos, discriminar eventos e evitar `any`. |
| Prática | Cronômetro com pausa; depois player de áudio; depois menu de jogo com transições inválidas bloqueadas. |
| Outras criações | Tour interativo, configurador de produto, escape room digital. |
| IA | Peça para gerar casos de transição, explicar um tipo ou sugerir testes; valide manualmente estados que ela omitir. |

### Espaço, tempo e interpolação

| Questão | Resposta |
|---|---|
| O que é / serve para | Vetores, matrizes, ângulos, normalização, lerp/easing e deltas de tempo; convertem intenção visual em movimento estável. |
| Problema / escolha | Evita animação dependente de FPS e layouts 3D quebrados em cada viewport. |
| No projeto | `Director.update()` suaviza estado; `Stage.resize()` calcula tamanho visível; `game/main.ts` interpola passos de simulação. |
| Estude antes | Álgebra básica, trigonometria, noção de plano cartesiano. |
| Domínio necessário | Intermediário antes de shaders/AR; não é preciso cálculo avançado. |
| Prática | Fazer cursor magnético, câmera que segue alvo e objeto que interpola entre posições. |
| Outras criações | Diagrama animado, mapa explodido, narrativa com scroll, câmera cinematográfica. |
| IA | Use-a para criar exercícios numéricos e revisar fórmulas; teste os limites (0, resize, 15 FPS) no navegador. |

### Three.js e pipeline 3D web

| Questão | Resposta |
|---|---|
| O que é / serve para | Biblioteca que organiza WebGL em cena, câmera, geometria, materiais, luzes, carregadores e render. |
| Problema / escolha | Entrega 3D interativo sem escrever WebGL puro; permite o nível de composição de `Stage`, jogo e coleção. |
| No projeto | Confirmado em `scene/*`, `ar/*`, `game/render/*` e `collection/*`. |
| Estude antes | DOM, módulos, coordenadas, render loop e noções de GPU. |
| Domínio necessário | Intermediário para cenas; avançado para otimizar/misturar shaders. |
| Prática | Cubo iluminado -> GLB com orbit controls próprios -> landing com uma cena persistente. |
| Outras criações | Configurador de produto, laboratório de personagem, museu virtual, visualizador de dados. |
| IA | Peça um esqueleto mínimo e explique cada classe; não aceite código que cria render loops ou renderers duplicados sem motivo. |

### Modelos glTF/GLB, rig e animação

| Questão | Resposta |
|---|---|
| O que é / serve para | glTF é formato aberto de entrega de cenas/modelos; GLB é sua forma binária única. Rigs e clips movem a malha por ossos. |
| Problema / escolha | Permite reutilizar o astronauta no landing, RA, jogo e coleção, em vez de desenhar cada versão do zero. |
| No projeto | `public/models/astronaut-rig.glb`; `Astronaut.load`, `Hologram.load` e `AstronautView.load` usam `GLTFLoader`. O script Blender corrige pesos do capacete. |
| Estude antes | Hierarquia de cena, escala, materiais e animação por keyframe. |
| Domínio necessário | Intermediário; avançado para rig/retargeting e compressão. |
| Prática | Exportar um objeto simples no Blender, carregar GLB e tocar dois clips. |
| Outras criações | Avatar de marca, produto animado, showroom, item colecionável. |
| IA | Use IA para checklist de exportação e análise de peso; confirme tamanho, textura, licenças e aparência no dispositivo. |

### Shaders, UVs e materiais procedurais

| Questão | Resposta |
|---|---|
| O que é / serve para | Pequenos programas de GPU: vertex shader posiciona vértices; fragment shader calcula cor de pixels. UV mapeia imagem para geometria. |
| Problema / escolha | Produz holografia, scanline, relevo aparente e partículas sem sequências de vídeo pesadas. |
| No projeto | `label/labelShaders.ts`, `ar/hologram.ts`, `game/render/{particles,environment,obstacles}.ts`. |
| Estude antes | Three.js, cor RGB/alpha, coordenadas UV, `sin`, `mix`, `smoothstep`. |
| Domínio necessário | Avançado para criar; leitura básica já traz retorno. |
| Prática | Gradiente por UV -> Fresnel -> máscara P&B -> scanline dependente do tempo. |
| Outras criações | Metal iridescente, água, tela CRT, transição de materialização, data art. |
| IA | Peça explicação linha a linha e versões visuais menores; compile e compare, pois shaders “plausíveis” podem não renderizar. |

### Motion e storytelling de interface

| Questão | Resposta |
|---|---|
| O que é / serve para | Uso de tempo, hierarquia, ritmo e transições para orientar atenção e contar uma sequência. |
| Problema / escolha | Conecta informação de embalagem a QR, identidade, personagem e ação, em vez de exibir blocos independentes. |
| No projeto | `Director.buildSections()` representa estados por seção; `present/slides.ts` usa hooks e GSAP para contadores. |
| Estude antes | CSS transitions/transform, easing, layout responsivo e objetivos de cada tela. |
| Domínio necessário | Intermediário; direção criativa é prática contínua. |
| Prática | Recontar uma história em 3 cenas: estabelecer, revelar, convidar à ação. |
| Outras criações | Pitch interativo, relatório vivo, onboarding, página de campanha. |
| IA | Dê objetivo, ritmo, contexto de audiência e restrições de acessibilidade; peça storyboard antes de código. |

### Jogos: simulação, estados e game feel

| Questão | Resposta |
|---|---|
| O que é / serve para | Uma simulação atualizada em passos previsíveis, render separadamente, com regras, input, risco/recompensa e feedback. |
| Problema / escolha | Mantém jogo justo, testável e sincronizável com ranking sem fazer física depender do frame renderizado. |
| No projeto | `game/sim/world.ts`, `generator.ts`, `tuning.ts`; loop de 1/120 em `game/main.ts`; teste em `tests/game.test.ts`. |
| Estude antes | Máquinas de estado, funções puras, colisão AABB, delta time, RNG/seed. |
| Domínio necessário | Intermediário para protótipo, avançado para balanceamento/procedural. |
| Prática | Flappy básico sem arte -> seed reprodutível -> gerador de obstáculos validado por teste. |
| Outras criações | Quiz com tempo, corrida de reação, simulador, experiência de quiosque. |
| IA | Peça propriedades testáveis (“sempre deve haver passagem segura”), não apenas “faça divertido”; rode centenas de seeds. |

### Visão computacional, QR e RA por imagem

| Questão | Resposta |
|---|---|
| O que é / serve para | Câmera capta frames; QR decodifica símbolo; tracking estima pose de uma imagem conhecida para posicionar objeto virtual. |
| Problema / escolha | Une embalagem física a conteúdo individual/imersivo. |
| No projeto | `scanner/*` e `ar/modes.ts`; `ImageTrackingMode` inicia stream, carrega MindAR e atualiza matriz-âncora. |
| Estude antes | HTTPS/permissões, vídeo HTML, canvas, noções de câmera e transformações. |
| Domínio necessário | Avançado para tracking robusto; intermediário para integrar biblioteca. |
| Prática | Scanner QR -> preview de câmera -> modelo ancorado a marker simples -> imagem real. |
| Outras criações | Manual em RA, caça ao tesouro, prova de procedência, cartão de visita vivo. |
| IA | Use-a para matrizes de dispositivos/casos de falha; teste fisicamente em iOS, Android, luz baixa e impressão real. |

### Backend, persistência e segurança de experiências

| Questão | Resposta |
|---|---|
| O que é / serve para | API valida ações e banco preserva fatos de negócio além do navegador. |
| Problema / escolha | Evita que cliente defina autenticidade do QR, coleção ou ranking. |
| No projeto | `backend/src/app.ts`, migrations e `db.ts`; seed e limite temporal do jogo são emitidos/checados pelo servidor. |
| Estude antes | HTTP, JSON, SQL básico, autenticação/sessão, modelagem e ameaças simples. |
| Domínio necessário | Intermediário para produto; avançado para segurança/privacidade em escala. |
| Prática | API local para placar com validação, migration e teste PGlite. |
| Outras criações | Evento com check-in, galeria com voto, desafio colaborativo. |
| IA | Peça threat model e testes de entrada; nunca cole segredos e nunca trate código gerado como revisão de segurança. |

## Conexões que vale memorizar

- **Ideia visual não é tecnologia:** “o rótulo revela camadas” pode ser CSS, vídeo, canvas ou shader. A tecnologia só entra depois de definir interação, dispositivo, peso e qualidade.
- **O 3D é uma linguagem de composição:** câmera, luz e escala contam história antes de qualquer biblioteca.
- **A robustez é parte da direção criativa:** fallback de câmera, modo low e ranking resiliente são decisões de experiência, não burocracia.
- **A melhor arquitetura preserva experimentação:** regras puras permitem brincar com o visual sem corromper o jogo; dados e render separados permitem trocar a cena.
