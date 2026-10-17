# Laboratório Prático — recriações progressivas

Regra: cada desafio é uma versão pequena, autoral e testável de um princípio da Innovation Week. Não copie arte, modelos ou código de produção para “terminar rápido”.

| # | Desafio e inspiração | Construa | Conhecimentos/bibliotecas | Etapas e validação | Evolução autoral |
|---|---|---|---|---|---|
| 1 | **Botão com propulsão** — HUD/feedback do jogo | Botão que responde a mouse, toque e teclado, tem estado carregando/sucesso e respeita motion reduzido. | Eventos, classes CSS, TypeScript; sem biblioteca. | 1) estados; 2) input; 3) animação; 4) foco/teclado. Valide com teclado, touch emulator e reduced-motion. | Transformar em CTA de “lançar ideia”. |
| 2 | **Objeto que conta uma história** — `Director` | Uma esfera/caixa 3D persistente que muda composição ao atravessar 3 seções HTML. | Three.js, lerp, câmera, resize. | 1) cena; 2) objeto; 3) estados por seção; 4) suavização. Valide 320 px e desktop sem objeto cobrir texto. | Escolher um objeto ligado a uma história pessoal. |
| 3 | **Cartão de material** — `DigitalLabelTwin` | Plano texturizado com máscara que revela acabamento holográfico ao mover ponteiro. | Texture, UV, GLSL básico. | 1) textura; 2) máscara; 3) uniforme do mouse; 4) fallback imagem. Valide no celular e com WebGL desligado. | Simular tecido, papel, metal ou tinta de uma marca fictícia. |
| 4 | **Personagem na vitrine** — coleção | Carregar GLB, centralizar na câmera, permitir giro e tocar `idle`. | GLTFLoader, animação, bounding box, dispose. | 1) exportar/obter GLB licenciado; 2) load progress; 3) fit camera; 4) drag. Valide tamanho do bundle e memória ao trocar modelos. | Uma galeria de criaturas/máquinas com biografia. |
| 5 | **Scanner de passaporte** — QR | Abrir câmera sob gesto do usuário, ler QR, validar payload e exibir resultado sem enviar dado. | `getUserMedia`, BarcodeDetector/jsQR, Worker. | 1) permissão; 2) vídeo; 3) decoder; 4) fechar tracks. Valide negação, desktop e QR inválido. | QR desbloqueia uma pista de caça ao tesouro. |
| 6 | **Holograma de mesa** — RA em duas fases | Mostrar GLB manipulável; depois ancorar em imagem impressa de teste usando MindAR. | Three.js, MindAR, pose/matriz, UX de tracking. | 1) preview; 2) compile target; 3) anchor; 4) “perdeu alvo”. Valide luz baixa, distância e dois celulares. | Uma peça de museu com fichas de restauração. |
| 7 | **Jetpack justo** — jogo | Runner 2D/3D mínimo com impulso, combustível e obstáculos gerados por seed. | Fixed timestep, AABB, RNG, testes. | 1) `World` puro; 2) input; 3) colisão; 4) seed; 5) gerador. Valide 100 seeds e 30/60 FPS. | Poder que muda uma regra, não só cor. |
| 8 | **Placar de missão** — dados | API local `start/finish/top` que recusa score impossível e uma tela de ranking. | Hono/Fastify, Postgres/PGlite, `fetch`, threat model básico. | 1) schema; 2) validação; 3) testes; 4) tela. Valide request forjada/duplicada e erro de rede. | Ranking por equipes, não indivíduos. |

## Erros comuns a evitar

- Começar pelo shader/asset antes de a interação essencial funcionar.
- Acoplar regra de jogo ao mesh/DOM e perder testabilidade.
- Deixar `requestAnimationFrame` ou `MediaStream` vivo depois de fechar uma experiência.
- Testar RA apenas no computador, sem HTTPS e sem rótulo físico.
- Tratar 60 FPS no desktop como validação de performance móvel.
- Confiar em pontuação enviada pelo cliente quando há prêmio, competição ou ação operacional.
- Usar referência como molde: extraia o princípio, depois mude contexto, narrativa e forma.

## Definition of done de cada laboratório

1. Uma frase de intenção e um desenho/roteiro de 3 beats.
2. README curto: tecnologia, como rodar, limitações e origem dos assets.
3. Pelo menos um caso de erro/fallback deliberado.
4. Um teste automatizado se houver regra; ou checklist manual de viewport/dispositivo se for visual.
5. Captura de vídeo/imagem e post-mortem: o que parecia mágico, o que custou FPS e o que faria diferente.
