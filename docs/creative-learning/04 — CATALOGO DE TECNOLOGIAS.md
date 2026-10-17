# Catálogo de Tecnologias — escolhas, não coleção de logos

Status de pesquisa: links verificados em 17/10/2026. Licenças devem ser reconfirmadas antes de produto comercial, atualização de versão ou inclusão de asset de terceiros.

## Stack existente e por que ela foi escolhida

| Tecnologia | Categoria | Aplicação e evidência | Curva / licença-custo | Compatibilidade e alternativa |
|---|---|---|---|---|
| [Three.js](https://threejs.org/) | Biblioteca 3D/WebGL | Cenas do landing, RA, jogo e coleção (`src/scene`, `src/ar`, `src/game`, `src/collection`). `WebGLRenderer` e addons de GLTF/pós são usados. | Média→alta; MIT, sem custo de licença da lib. | Excelente para TS/Vite; [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction) é alternativa se o app for React. |
| [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) | Addon de assets 3D | Carrega astronauta e spacesuit em `Astronaut`, `Hologram` e render do jogo. | Média; parte do ecossistema Three. | Preferir GLB para entrega web; ver compressão/DRACO/KTX2 somente quando profiling pedir. |
| [EffectComposer](https://threejs.org/docs/#examples/en/postprocessing/EffectComposer) | Pós-processamento | O jogo encadeia render, bloom e output em `game/render/stage.ts`. | Média; addon Three. | Use com orçamento de FPS; alternativa é material emissivo sem bloom. |
| GLSL / ShaderMaterial | Linguagem/conceito | Holograma, label, estrelas, partículas e obstáculos (`labelShaders.ts`, `hologram.ts`, `game/render/*`). | Alta; parte da plataforma WebGL. | Shader Graph em engine desktop é alternativa; WebGPU/WGSL é exploração futura. |
| [MindAR](https://github.com/hiukim/mind-ar-js) | Biblioteca WebAR/visão | Rastreamento de imagem do rótulo em `ar/modes.ts`; target compilado `label.mind`. | Média→alta; MIT. | Boa para imagem/face tracking em WebAR; AR.js serve para marcadores. Avaliar soluções pagas para suporte comercial/SLA. |
| `getUserMedia` | API de navegador | Pede câmera em scanner e RA. | Média; API web sem licença. | Exige HTTPS, permissão e testes físicos; sempre oferecer fallback. |
| jsQR + BarcodeDetector | Biblioteca + API | Worker de fallback e scanner em `src/scanner/*`. | Baixa→média; jsQR é dependência local. | `BarcodeDetector` melhora caminho nativo; mantenha worker para compatibilidade. |
| [GSAP](https://gsap.com/docs/v3/GSAP/Timeline/) | Biblioteca de motion | Contadores/entradas em apresentação e admin. | Baixa→média; confira licença atual no site ao publicar. | Não é usado no scroll principal; CSS/WAAPI podem bastar para animações simples. |
| Vite | Build tool | Scripts `dev`, `build`, `check` no `frontend/package.json`. | Baixa; ferramenta open source. | Ótimo para app estático; Next.js só é necessário se SSR/React justificar. |
| Hono | Framework HTTP | `backend/src/app.ts`. | Baixa→média; dependência open source. | Bom para API pequena; Fastify/Express são alternativas, não melhorias automáticas. |
| PostgreSQL + `pg` | Banco/driver | Migrations, registro de unidades, eventos, cadastros e ranking. | Média; Postgres livre, provedor pode cobrar. | Mantém dados transacionais; Supabase/Railway são escolhas de operação, não APIs presentes no código de IW. |
| PGlite | Ambiente de teste | Dev dependency; testes da API sem Postgres externo. | Média; ambiente local. | Excelente para feedback/testes; produção continua Postgres. |

## Ferramentas para aprender depois — quando usá-las

| Ferramenta | Use quando | Não use só porque | Exemplo possível | Relevância para IW |
|---|---|---|---|---|
| [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/your-first-scene) | A experiência já é React e a cena se beneficia de composição declarativa. | “Three.js puro é antigo”. | Configurador 3D com UI React e estado compartilhado. | Alternativa arquitetural, não dependência existente. |
| [Phaser](https://docs.phaser.io/phaser/getting-started/what-is-phaser) | O jogo é predominantemente 2D e precisa de cenas, sprites/tilemap ou física 2D. | “Todo jogo web deve usar engine”. | Runner 2D, quiz, jogo de puzzle. | Alternativa; o Astronaut Jetpack usa Three.js por ser 3D. |
| Rapier | A mecânica pede física rígida/colisões complexas. | Há apenas colisão simples. | Jenga, pinball, objetos empilháveis. | Não necessário para AABB e movimento controlado do jogo atual. |
| WebXR | O público possui hardware/browser compatível e a experiência requer planos, hit-test, headset ou âncoras espaciais. | “AR web = WebXR”. | Instalar escultura virtual no piso. | Futuro possível; não confirmado no projeto. Compatibilidade ainda exige matriz de dispositivos. |
| WebGPU/WGSL | Profiling provou limite do WebGL e o público-alvo suporta. | O navegador expõe `navigator.gpu`. | Simulação de partículas muito grande. | `perf/tier.ts` apenas detecta WebGPU; renderer atual é WebGL. |
| Blender | Você precisa criar, riggar, corrigir ou otimizar assets próprios. | Um GLB já existe. | Mascote com clips idle/fly/impact. | Já aparece no pipeline de `scripts/build_astronaut_rig.py`. |
| Rive/Lottie | A animação é vetorial/UI e precisa ser entregue por designer com estados claros. | Você quer qualquer animação. | Botão animado, loading de marca, micro-onboarding. | Boa complementação de UI; não foi encontrada em IW. |
| GSAP ScrollTrigger | O documento/DOM é a linha do tempo e pin/scrub aceleram a implementação. | Há scroll no produto. | Relatório com seções pinadas. | Alternativa ao `Director`; o projeto não importa o plugin. |

## Combinações profissionais frequentes

| Objetivo | Combinação | Decisão crítica |
|---|---|---|
| Produto narrativo 3D | Vite/React + Three.js + GSAP/estado de cena + assets GLB | Preserve uma cena e um render loop; não crie canvas por seção. |
| Campanha físico-digital | QR/Digital Link + API de ativação + `getUserMedia` + MindAR/preview 3D | Definir privacidade, fallback e quais dados realmente identificam a unidade. |
| Jogo de marca | Simulação pura TS + render Three/Phaser + telemetria/API | Definir regra testável antes de animar; servidor controla o que tem valor. |
| Apresentação de palco | HTML multipágina + dados HTTP + scene state + GSAP | Operação precisa de modo offline, tela legível e controles previsíveis. |
| Laboratório autoral | Sketch/Blender + protótipo de 1 efeito + captura de referência + perfil de performance | Provar sensação e viabilidade antes de construir plataforma. |

## Como escolher tecnologia para uma ideia que ainda não sabe fazer

1. Descreva a experiência sem nomear biblioteca: público, dispositivo, duração, ação e sensação desejada.
2. Desenhe o menor “momento mágico” que prova a tese.
3. Classifique o mecanismo: DOM/motion, canvas 2D, 3D, câmera/visão, dados ao vivo ou jogo.
4. Consulte primeiro documentação oficial, exemplos mínimos e limitações de browser/licença.
5. Faça um spike isolado de 2–4 horas; meça FPS/peso e teste no dispositivo real.
6. Só então escolha a arquitetura do produto e comprometa dependências.

## Referências externas verificáveis

- [Three.js Manual](https://threejs.org/manual/) e [examples](https://threejs.org/examples/): fundamentos, carga de assets e protótipos executáveis.
- [MindAR documentation](https://hiukim.github.io/mind-ar-js-doc/) e [repositório](https://github.com/hiukim/mind-ar-js): image/face tracking, compilador de targets e licença MIT.
- [MDN WebXR](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API): use para entender XR; verifique compatibilidade antes de depender dela.
- [GSAP docs](https://gsap.com/docs/): timeline e plugins de scroll/motion.
- [Phaser docs](https://docs.phaser.io/): referência para jogos web 2D, não substituto de render 3D.
- [React Three Fiber docs](https://r3f.docs.pmnd.rs/): ponte declarativa React→Three.js; estude depois dos fundamentos Three.
- [Blender Manual](https://docs.blender.org/manual/en/latest/): modelagem, rig, animação e exportação.

## Limites de custo e licença

Bibliotecas open source não tornam automaticamente uma produção “sem custo”: hospedagem, banda, monitoramento, serviços de AR pagos, assets/modelos, tipografia, música, permissões de imagem e manutenção podem ter custo ou restrição. Para cada asset, registre origem, licença, autor, alterações e uso comercial permitido. Não há evidência no repositório que prove licença dos assets artísticos externos; trate-os como pertencentes ao projeto até haver documentação de origem.
