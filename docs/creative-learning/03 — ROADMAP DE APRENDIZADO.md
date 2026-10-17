# Roadmap de Aprendizado Personalizado

Ponto de partida considerado: familiaridade prática com React, Next.js, TypeScript e ferramentas de IA. A Innovation Week usa TypeScript/Vite sem React; portanto, o primeiro ganho não é outra framework, e sim dominar as camadas do navegador e da renderização que frameworks escondem.

## Sequência recomendada

```text
JS/TS para interações -> movimento e canvas/DOM -> Three.js básico
  -> assets/GLB e performance -> shaders/scroll storytelling
  -> simulação de jogo e API -> câmera/QR/AR -> direção autoral
```

## Nível 1 — Fundamentos

### M1. Sistemas interativos no navegador (2 semanas, 6–8 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Modelar interação como estados, eventos e efeitos previsíveis. |
| Pré-requisitos | JavaScript/TypeScript básico. |
| Fundamentos | Event loop, `requestAnimationFrame`, DOM, storage, promises, eventos de ponteiro/teclado, acessibilidade. |
| Tecnologias | TypeScript, browser APIs, CSS transforms. |
| Materiais | [MDN Web APIs](https://developer.mozilla.org/en-US/docs/Web/API), arquivos `src/game/main.ts` e `src/scanner/camera.ts`. |
| Exercícios | Cursor de atração; menu modal com Escape/foco; botão com loading/erro/sucesso. |
| Miniprojeto | “Controle de missão”: painel com três sistemas e estados offline/online, sem framework. |
| Critério objetivo | Não há loops duplicados, todos os estados têm saída e o teclado funciona. |
| Ligação | Estados `loading/menu/playing/paused/over` em `game/main.ts`. |

### M2. Matemática para movimento e composição (2 semanas, 5–7 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Transformar posição, rotação e tempo em movimento legível. |
| Pré-requisitos | M1. |
| Fundamentos | Vetores 2D/3D, radianos, seno/cosseno, lerp, clamp, easing, delta time, viewport. |
| Tecnologias | TypeScript e, depois, `THREE.Vector3`/`MathUtils`. |
| Materiais | [Three.js Fundamentals](https://threejs.org/manual/#en/fundamentals), `story/Director.ts`. |
| Exercícios | Orbitar um objeto; suavizar uma câmera; converter posição de card em coordenada de canvas. |
| Miniprojeto | Uma constelação que responde a ponteiro e resize. |
| Critério objetivo | Movimento permanece igual em 30/60 FPS e não quebra em celular/desktop. |
| Ligação | `Stage.resize()` e o estado amortecido do `Director`. |

## Nível 2 — Ferramentas

### M3. Three.js: cena, câmera, luz e assets (3 semanas, 8–10 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Construir e depurar uma cena 3D leve e responsiva. |
| Pré-requisitos | M1–M2. |
| Fundamentos | Scene graph, perspectiva, materiais PBR, color space, render loop, carregamento e dispose. |
| Tecnologias | Three.js, GLTFLoader, devtools/Spector.js opcional. |
| Materiais | [WebGLRenderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer), [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader). |
| Exercícios | Três luzes; GLB centralizado; troca de animação; fallback se WebGL faltar. |
| Miniprojeto | Vitrine 3D de um objeto pessoal, com drag e botão de movimento reduzido. |
| Critério objetivo | GLB aparece com escala previsível, canvas redimensiona corretamente e recursos são descartados. |
| Ligação | `Stage`, `CharacterViewer`, `Astronaut`. |

### M4. Motion e narrativa de scroll (2 semanas, 6–8 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Construir sequência com intenção, não uma coleção de efeitos. |
| Pré-requisitos | M1–M3. |
| Fundamentos | Beats narrativos, antecipação, continuidade, atenção, estado de cena, reduced motion. |
| Tecnologias | CSS, GSAP core; ScrollTrigger apenas em experimento separado. |
| Materiais | [GSAP Timeline](https://gsap.com/docs/v3/GSAP/Timeline/), [ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), `present/slides.ts`. |
| Exercícios | Intro de 3 beats; contador que não engana; saída que conserva contexto. |
| Miniprojeto | Página “de objeto a universo” com objeto persistente e 4 seções. |
| Critério objetivo | Cada transição tem propósito explicado em uma frase; não depende de animação para compreender conteúdo. |
| Ligação | Âncoras de `Director.buildSections()` e hooks da apresentação. |

### M5. Shaders e materiais expressivos (3 semanas, 7–9 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Criar material autoral simples e saber debugar GLSL. |
| Pré-requisitos | M2–M3. |
| Fundamentos | Vertex/fragment, uniforms, varyings, UV, textura, máscara, ruído, blending, alpha/depth. |
| Tecnologias | GLSL + `THREE.ShaderMaterial`. |
| Materiais | [Three.js ShaderMaterial](https://threejs.org/docs/#api/en/materials/ShaderMaterial), `label/labelShaders.ts`. |
| Exercícios | Gradiente, Fresnel, scanline, dissolve com máscara. |
| Miniprojeto | Cartão holográfico controlado por mouse e `prefers-reduced-motion`. |
| Critério objetivo | Você explica cada uniform, tem fallback e mede o custo no mobile. |
| Ligação | Rótulo e `Hologram`. |

## Nível 3 — Construção

### M6. Jogos web testáveis (3 semanas, 8–10 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Criar jogo pequeno com regras consistentes e feedback satisfatório. |
| Pré-requisitos | M1–M3. |
| Fundamentos | Fixed timestep, máquina de estados, colisão, RNG/seed, dificuldade, pooling, áudio/haptics, testes. |
| Tecnologias | TypeScript + Three.js; Phaser é alternativa para 2D. |
| Materiais | `game/sim/{world,generator,tuning}.ts`, [Phaser: o que é](https://docs.phaser.io/phaser/getting-started/what-is-phaser). |
| Exercícios | Controle de impulso; AABB; seed reproduzível; 100 partidas automáticas. |
| Miniprojeto | Jetpack 2D com obstáculo seguro e ranking apenas local. |
| Critério objetivo | O render pode cair a 30 FPS sem mudar resultado da simulação; testes cobrem colisão e geração. |
| Ligação | Astronaut Jetpack. |

### M7. Câmera, QR e RA por imagem (3 semanas, 6–8 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Integrar mundo físico e digital com degradacão honesta. |
| Pré-requisitos | M1–M3; M5 ajuda. |
| Fundamentos | HTTPS/permissões, vídeo, canvas, `getUserMedia`, QR, pose, target image, UX de erro. |
| Tecnologias | BarcodeDetector/jsQR, MindAR; WebXR como investigação posterior. |
| Materiais | [MindAR](https://github.com/hiukim/mind-ar-js), [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), `ar/modes.ts`. |
| Exercícios | QR validado; seleção de câmera; preview GLB; anchor em alvo compilado. |
| Miniprojeto | Cartão impresso que revela uma criatura e oferece captura de foto. |
| Critério objetivo | Funciona ou explica a falha em iOS/Android/desktop; tracks são sempre fechados ao sair. |
| Ligação | `ImageTrackingMode` e fallback nativo. |

### M8. API e dados de experiência (2 semanas, 6–8 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Não delegar ao cliente fatos que importam. |
| Pré-requisitos | HTTP, SQL básico, M1. |
| Fundamentos | Request validation, migrations, sessão, rate limit, modelo de dados, privacidade. |
| Tecnologias | Hono ou Fastify, PostgreSQL, testes de integração. |
| Materiais | `backend/src/app.ts`, migrations e [PostgreSQL documentation](https://www.postgresql.org/docs/). |
| Exercícios | Placar com `start/finish`; migration; entrada inválida; teste em DB temporário. |
| Miniprojeto | Passaporte digital de evento com token e uma conquista. |
| Critério objetivo | O servidor recusa pontuação impossível e não expõe segredo/dado desnecessário. |
| Ligação | API de ranking, cadastro e `registry_units`. |

## Nível 4 — Criação autoral

### M9. Laboratório de direção criativa (contínuo; 4 h/semana)

| Item | Plano |
|---|---|
| Objetivo | Partir de uma tese e não de “qual biblioteca usar?”. |
| Pré-requisitos | M1–M5; M6/M7 conforme tema. |
| Fundamentos | Brief, audiência, metáfora, storyboard, protótipo, teste, restrição de produção e ética. |
| Tecnologias | Escolhidas por hipótese: não há stack obrigatória. |
| Materiais | Documentos 05 e 07 desta pasta; arquivo pessoal de referências. |
| Exercícios | Toda semana: uma referência desmontada, uma variação autoral de 2 h e um post-mortem. |
| Miniprojeto | Uma experiência de 90 segundos ligada a objeto real, com intenção e fallback documentados. |
| Critério objetivo | Você consegue explicar “para quem, por quê, qual sensação, qual limitação e por que esta tecnologia”. |
| Ligação | Método por trás da Innovation Week inteira. |

## Ritmo viável e avaliação

- Faça duas sessões de estudo (60–90 min), uma sessão de desmontagem/referências (45 min) e uma sessão de laboratório (2–3 h) por semana.
- Só avance de módulo quando seu miniprojeto atender o critério objetivo, não quando terminar uma playlist.
- Mantenha um repositório de experimentos pequeno por assunto. A meta é aprender decisões e falhas, não montar um “mega clone” da Innovation Week.
- React Three Fiber entra depois de M3 se o próximo produto for React. Ele é um renderer declarativo para Three.js, não substituto dos fundamentos de câmera, luz e loop.
