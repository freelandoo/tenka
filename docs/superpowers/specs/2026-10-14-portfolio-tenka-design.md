# Portfólio TENKA — design

Data: 2026-10-14 · Entregas 2–5 (a 1 foi a Innovation Week em `/innovation-week`).

## Ideia

O portfólio é a própria demonstração: o visitante **mexe** no trabalho (gira o
personagem, vê a malha, joga o jogo, vê o ranking ao vivo) em vez de olhar um print.
Cada divisão ganha uma "sala de exposição" na linguagem que a página já tem, e
**toda peça vem explicada** — o que é, como foi feita, por que importa — com números
reais tirados dos projetos, nunca inventados.

## Entrega 2 — TENKA Games (`/games`)

1. **Laboratório de Personagens.** Palco 3D (R3F, já no bundle de /games) com os
   lutadores reais do EVO BRAZIL. Seleção no estilo da tela do jogo. Linha do tempo
   do pipeline: CONCEITO (model sheet) → ESCULTURA (argila, sem textura) → MALHA
   (wireframe + triângulos reais) → TEXTURA → EM COMBATE (Cat Demon com os golpes
   atk1–5). Arrastar gira.
2. **Case EVO BRAZIL.** Travelling pelas telas reais (seleção, arena, vale, torneio)
   com HUD de números de engenharia.
3. **Fliperama Astronaut Jetpack.** O jogo real (`/innovation-week/jogo`) jogável num
   gabinete na página, em modo vitrine (não grava no ranking oficial), ranking ao vivo
   ao lado e link para a experiência completa.
4. **Vitrine de relíquias.** Itens/relíquias 3D do jogo girando numa prateleira.

## Entrega 3 — TENKA Studios (`/studios`)

1. **Rótulo Innovation Week em camadas.** Vista explodida 3D das 7 separações
   (`explodedOrder` em `innovation-week/frontend/src/label/labelConfig.ts`): arte,
   calço branco, verniz textura, verniz relevo, casting holográfico, luminescente,
   fotoluminescente — cada camada se separa com explicação do acabamento e de onde
   aparece. Depois a animação do rótulo e o astronauta 3D.
2. **Canal CASA VIEWS.** Sérgio (lutador do Coliseu, `sergio.glb`) renderizando no
   holograma rosa da vitrine RA; rankings de audiência e participantes como placares
   animados; texto sobre o projeto.

## Entrega 4 — TENKA Tech (`/tech`)

Janelas do desktop com produtos reais no lugar das demos: Freelando (comunidades,
sistema de academias, sistema de condomínios) em telas animadas; Innovation Week ao
vivo numa janela + trechos animados. Sai o conteúdo marcado como "Fake production URL".

## Entrega 5 — Arquivo TENKA (`/projetos`)

Índice de todos os cases com prévias em movimento, apontando para cada sala.

## Regras transversais

- 3D só carrega quando a seção entra na tela; modelos comprimidos (meshopt + texturas
  WebP ≤1024). `catdemon_jogo.glb` 17,7 MB → alvo ≤3 MB.
- `prefers-reduced-motion` ou GPU fraca: imagem/vídeo estático no lugar do 3D.
- Assets copiados do projeto-fonte para `frontend/public/portfolio/<case>/`
  (derivados web; originais ficam fora do repo).
- Textos explicativos em pt-BR, factuais; números só de fonte verificável no projeto.
- Uma entrega por vez, no ar e verificada (Playwright) antes da próxima.
