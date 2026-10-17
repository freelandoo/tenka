# Desenvolvimento Criativo — método para construir repertório tecnológico

## O processo que a Innovation Week sugere

O repositório evidencia o resultado técnico, não o pensamento original de quem o concebeu. A reconstrução abaixo é, portanto, uma **hipótese de processo**, sustentada por evidências do código.

```text
Objeto físico com QR
  -> hipótese: “a embalagem pode ser portal, não só suporte”
  -> narrativa: superfície -> camadas -> identidade -> astronauta -> ação
  -> protótipos: rótulo WebGL, target de RA, movimento do personagem, loop de jogo
  -> integração: ativação, coleção, ranking, telão/admin
  -> refinamento: fallback, DPR, bloom adaptativo, modo low e dados validados
```

### Exemplos concretos de raciocínio criativo reconstruído

| Evidência no projeto | Problema/objetivo provável | Decisão técnica | Experimento que deveria preceder | Status |
|---|---|---|---|---|
| `Director.buildSections()` manipula um objeto persistente | Fazer a página parecer uma história única, não páginas empilhadas | Estado de cena por âncoras e interpolação | Rótulo primitivo em 3 seções e teste de viewport | Inferência sobre intenção; implementação confirmada. |
| Máscaras/layers e shaders do label | Tornar acabamento de embalagem visível sem filmar cada efeito | UV + máscaras + fragment shaders | Uma máscara, um efeito de luz, impressão real como referência | Implementação confirmada; origem da ideia não é conhecida. |
| `ImageTrackingMode` e prévia | Levar o personagem ao mundo físico sem excluir quem perde câmera/tracking | MindAR + fallback GLB + Quick Look/Scene Viewer | Target impresso sob luz ruim e fluxo sem permissão | Implementação confirmada; prioridade de negócio inferida. |
| `Generator.placeFuel()` usa alcance | Evitar que recompensa torne a partida injusta | Física/alcance em vez de aleatoriedade cega | Simular centenas de seeds e analisar mortes | Implementação e testes confirmados. |
| Bloom desligável, tiers e `releaseLanding` | Manter encanto em aparelhos heterogêneos | Degradação progressiva | FPS/device matrix e perf capture | Implementação confirmada. |

## Método semanal de repertório

| Dia/ritual | Duração | Resultado concreto |
|---|---:|---|
| Segunda — caça | 30 min | Salvar 3 referências com URL, autor, contexto e “momento mágico”. |
| Terça — desmontagem | 45 min | Uma ficha: o que vejo, quais mecanismos podem explicar, o que não sei. |
| Quarta — docs | 45 min | Ler uma fonte primária e um exemplo oficial da tecnologia hipotética. |
| Quinta — spike | 90 min | Provar um único mecanismo em repositório de laboratório. |
| Sexta — mutação | 45 min | Mudar metáfora, público ou input da referência; esboçar versão autoral. |
| Sábado — crítica | 30 min | Gravar tela, medir FPS/peso, escrever 5 linhas de post-mortem. |

Não acompanhe tendências como lista de ferramentas. Observe padrões: câmera como input, objeto persistente como protagonista, fisicalidade simulada, dados vivos como parte da cena, interfaces que assumem falha de dispositivo e a volta de estética editorial/tátil.

## Protocolo de engenharia reversa ética

1. Registre a referência e seus créditos.
2. Separe observação (“há transição de máscara”) de hipótese (“talvez seja shader”).
3. Nomeie o princípio (“revelação progressiva de material”), não o resultado visual exato.
4. Recrie o princípio com asset, texto e contexto próprios.
5. Compare performance e UX; registre divergências.
6. Nunca reutilize modelos, música, textura, marca ou código sem licença/autorização.

## Catálogo pessoal de tecnologia e referências

Crie uma nota por item com este modelo:

| Campo | Preencha assim |
|---|---|
| Tecnologia/princípio | Ex.: “rastrear imagem impressa” — não só “MindAR”. |
| Possibilidades | Três interações que isso permite. |
| Exemplo e crédito | Link, autor/estúdio, data e captura própria. |
| Evidência técnica | Docs, código aberto ou hipótese marcada. |
| Limitações | Browser, permissão, peso, luz, custo, acessibilidade. |
| Dificuldade | Inicial/intermediária/avançada + pré-requisitos. |
| Ideia autoral | Quem usa, onde, qual emoção e por quê. |
| Spike | Menor teste, tempo-limite e critério de sucesso. |
| Aprendizado | O que funcionou, o que falhou e o que reutilizar. |

## Como encontrar a ferramenta certa

- Consulte [Awwwards](https://www.awwwards.com/), CodePen, GitHub e portfolios como **fontes de referência**, mas procure depois fonte primária e autoral para validar o mecanismo.
- Pesquise por comportamento, não por efeito: “image tracking web open source”, “fixed timestep web game”, “WebGL product material shader”.
- Abra DevTools, Network e Performance de exemplos públicos para formular hipóteses; não conclua tecnologia apenas pelo visual.
- Quando houver código aberto, leia primeiro `package.json`, entrypoint, uma feature representativa e testes. É exatamente a sequência usada nesta investigação.
- Prefira protótipos pequenos; “saber fazer” vem de comparar uma intenção com o limite real do navegador, não de reconhecer uma biblioteca.

## Critério de maturidade criativa

Você está evoluindo quando passa de “qual lib faz isso?” para perguntas como: “qual é o gesto central?”, “isso precisa ser 3D?”, “onde a experiência pode falhar com dignidade?”, “qual aspecto merece 16 ms de frame?”, “que parte torna esta ideia minha?”.
