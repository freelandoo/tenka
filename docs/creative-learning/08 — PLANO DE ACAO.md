# Plano de Ação — 30, 60 e 90 dias

## Diagnóstico executivo

Você já parte de uma base muito útil: web moderna, React/Next, TypeScript e uso de IA. Isso transfere diretamente para componentes, estados, HTTP, organização de projeto e prototipação. A principal lacuna para criar experiências como Innovation Week não é “saber mais frameworks”; é dominar como tempo, espaço, GPU, assets e dispositivos físicos mudam o processo de projeto.

| Agora aproveite | Lacuna prioritária | Não priorize ainda |
|---|---|---|
| TypeScript, componentes, rotas, estado e IA | Matemática visual + render loop + Three.js fundamental | Trocar para outra framework 3D antes de entender Three. |
| Experiência web e responsividade | Performance móvel, dispose, assets/GLB e fallback | WebGPU/WebXR avançado só por novidade. |
| APIs e produto digital | Máquina de estados, simulação e testes de jogo | Engine grande para um primeiro minijogo. |
| Capacidade de pesquisar | Direção de arte/motion e leitura crítica de referências | Clonar referência ou depender da IA para decisões. |

## Tecnologias com maior retorno imediato

1. **Three.js + GLTFLoader** — maior alavanca porque já é o núcleo de landing, jogo, AR e coleção.
2. **Vetores/interpolação/tempo** — conhecimento que desbloqueia direção de cena, câmera e game feel.
3. **GLSL básico** — permite sair de “cena com modelo” para material/autoria visual.
4. **Câmera/QR/MindAR** — diferencia experiências físico-digitais e aplica diretamente ao projeto.
5. **Simulação pura + testes** — evita jogos/aplicações interativas bonitos mas imprevisíveis.

## Primeiro projeto de estudo

**Cartão de Missão Interativo**: uma página Vite + TypeScript, com um único objeto 3D ligado a três seções narrativas; no último beat, um QR real abre um “passaporte” local. Não há cadastro, banco, RA ou jogo na primeira versão.

Critérios de conclusão:

- Canvas 3D tem uma única cena/câmera/render loop e funciona em 320 px e desktop.
- A composição responde a scroll ou botões, com modo reduzido de movimento.
- Um GLB licenciado/carregado com progress indicator aparece correto.
- QR é gerado/lido ou, se ficar fora do prazo, é explicitamente simulado.
- README relata assets, limitações, FPS observado e uma decisão criativa que você descartou.

## Metas

| Horizonte | Foco | Entrega observável |
|---|---|---|
| 30 dias | M1–M3 do roadmap | Três exercícios pequenos + Cartão de Missão; entende cena/câmera/GLB e depura resize. |
| 60 dias | M4–M6 | Uma narrativa 3D curta e um minijogo com seed, estados e pelo menos cinco testes de regras. |
| 90 dias | M5, M7 e M8 em versão mínima | Experiência física-digital: QR -> preview/target de RA -> uma conquista validada por API local, mais post-mortem de dispositivo real. |

## Semana 1, sem ambição excessiva

1. Leia `01 — RAIO-X DO PROJETO.md` junto com `src/main.ts`, `scene/Stage.ts` e `story/Director.ts`.
2. Crie um experimento isolado: caixa Three.js e câmera responsiva, sem asset.
3. Faça a caixa atravessar três estados por botões; depois troque os botões por scroll.
4. Grave um vídeo curto, teste `prefers-reduced-motion` e escreva o que não entendeu.
5. Use o primeiro prompt do documento 06 para pesquisar apenas a próxima dúvida concreta.

## Resultado esperado ao final

Em 90 dias, a meta não é reproduzir toda a Innovation Week. É conseguir decompor uma ideia em mecanismos, provar o momento mágico em uma tarde, selecionar tecnologia por evidência, construir com fallback e explicar criativamente por que cada decisão existe. Essa é a passagem de consumidor de referências para creative developer autoral.
