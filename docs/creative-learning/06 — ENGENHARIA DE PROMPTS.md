# Engenharia de Prompts para Desenvolvimento Criativo

IA acelera pesquisa, rascunho, explicação e revisão. Ela não confirma compatibilidade, direitos de asset, performance, segurança ou qualidade de direção criativa. Use este ciclo: **brief -> hipótese -> protótipo mínimo -> teste real -> crítica -> iteração**.

## Contexto que todo prompt técnico deve incluir

```text
Objetivo e sensação: [o que a pessoa deve sentir/fazer]
Público e dispositivo: [celular/desktop/evento; navegadores mínimos]
Stack e restrições: [Vite + TS + Three; sem dependência nova sem justificativa]
Orçamento: [peso, FPS, prazo, acessibilidade, privacidade]
Entrada/saída: [assets disponíveis, ação e estado final]
Critérios de aceitação: [3–5 testes observáveis]
Evidência desejada: [arquivos, docs oficiais, riscos e alternativas]
```

## Modelos reutilizáveis

### 1. Descobrir tecnologias para uma ideia

```text
Quero criar [experiência] para [público] em [dispositivo]. A ação principal é
[ação] e a sensação é [sensação]. Stack atual: [stack]. Restrições: [peso/FPS/
sem câmera/privacidade]. Não comece por bibliotecas: decomponha em mecanismos
(DOM, 2D, 3D, câmera, rede, jogo). Para cada mecanismo, proponha uma tecnologia
primária e no máximo uma alternativa, com documentação oficial, compatibilidade,
licença/custo e risco. Separe fato, hipótese e decisão a validar com spike.
```

### 2. Pesquisar experiências semelhantes

```text
Pesquise referências de [tipo de experiência], não para copiar visualmente, mas
para extrair padrões. Para cada referência, descreva: objetivo, interação,
linguagem visual, provável mecanismo técnico, risco de produção e um princípio
que posso reinterpretar. Traga links diretos e marque inferências como inferências.
Priorize fontes oficiais, demos executáveis e portfólios com crédito.
```

### 3. Analisar uma referência visual

```text
Analise esta referência [imagem/link/vídeo] como diretor criativo e engenheiro.
Separe observável de hipótese. Mapeie composição, ritmo, câmera, luz, materiais,
hierarquia, feedback, áudio e estados. Depois proponha três recriações autorais
de complexidade baixa/média/alta que preservem o princípio sem copiar a peça.
```

### 4. Selecionar bibliotecas/frameworks

```text
Compare [opção A], [opção B] e [opção C] para [caso específico]. Meu projeto
usa [stack] e precisa [requisitos]. Avalie maturidade, tamanho, compatibilidade,
licença, integração, manutenção, acessibilidade e risco. Indique uma escolha,
o menor spike para prová-la e condições que fariam a escolha mudar. Não recomende
dependência se APIs nativas/código pequeno bastarem.
```

### 5. Planejar arquitetura de experiência

```text
Planeje a arquitetura de [experiência]. Separe: regras puras, estado de UI,
render, input, assets, rede/persistência e observabilidade. Desenhe fluxo de
estado e ciclo de vida (iniciar, pausar, erro, fechar, descartar recursos).
Liste arquivos/módulos propostos, contratos TypeScript e testes. Diga explicitamente
o que ficará fora do protótipo inicial.
```

### 6. Criar prova de conceito

```text
Crie um spike mínimo para provar [hipótese], em [stack]. Critérios: [critérios].
Não crie sistema de autenticação, design system ou abstrações genéricas. Explique
como rodar, como medir sucesso e quais falhas devem ser esperadas. Pare depois de
provar/refutar a hipótese e proponha o próximo experimento.
```

### 7. Implementar animação complexa

```text
Quero coreografar [elementos] de [estado inicial] a [estado final] em [duração/
gatilho]. Primeiro crie um storyboard em beats e uma tabela de propriedades por
beat. Depois proponha uma implementação que respeite `prefers-reduced-motion`,
resize e input interrompendo animação. Diga se é melhor CSS, WAAPI, GSAP ou estado
de cena próprio e por quê.
```

### 8. Desenvolver experiência 3D

```text
Projete uma cena Three.js de [objeto/interação]. Device alvo: [x]. Orçamento:
[bundle/FPS]. Defina câmera, composição, luz, materiais, assets, render loop,
estratégia de resize e degrade. Inclua checklist de `dispose`, color space,
loading e profiling. Gere primeiro geometria primitiva; GLB só depois que a
composição funcionar.
```

### 9. Desenvolver jogo/interação

```text
Desenhe a mecânica [descrição] como sistema verificável. Liste estados, input,
regras, variáveis de tuning, eventos de feedback e condições de derrota/vitória.
Separe simulação pura de render. Proponha uma propriedade que posso testar em
centenas de seeds (por exemplo, sempre existe rota alcançável). Só então sugira
camadas visuais/áudio.
```

### 10. Revisar uma experiência existente

```text
Revise [arquivos/URL] em quatro lentes: intenção criativa, UX/acessibilidade,
arquitetura e performance. Para cada achado, cite evidência, impacto, prioridade,
hipótese de causa e menor correção. Diferencie bug confirmado, risco e gosto
subjetivo. Não altere código ainda; entregue plano de validação primeiro.
```

## Como validar respostas de IA

| Risco | Pergunta de controle | Evidência necessária |
|---|---|---|
| Biblioteca alucinada/desatualizada | Ela existe, é mantida e é compatível com a versão atual? | Docs/repo oficial e pacote real. |
| Código que “parece certo” | Compila, linta, roda e não cria loop/recurso duplicado? | Testes, console e profiling. |
| Solução frágil em celular | Funciona em touch, rede ruim, device lento e reduced motion? | Matriz manual de dispositivos. |
| AR/câmera idealizada | HTTPS, permissão negada, perda de target e saída limpam tudo? | Teste físico e inspeção dos tracks. |
| Segurança negligenciada | O cliente consegue forjar dado de valor? | Teste de API e validação de servidor. |
| Referência copiada | A solução tem nova tese, metáfora e forma? | Brief e comparação crítica. |

## O que pedir para a IA não fazer

- Não instalar dependências, publicar, chamar APIs pagas, usar credenciais ou importar asset sem autorização explícita.
- Não inventar que uma feature está no código; exigir caminho/linha ou marcar como hipótese.
- Não prometer suporte de navegador sem matriz de compatibilidade.
- Não transformar uma prova de conceito em arquitetura de produto antes da validação.

## Papel ideal da IA no seu processo

Use-a como pesquisadora que amplia opções, professora que explica a camada que você não vê, parceira de pair programming para spikes, geradora de testes e crítica que encontra incongruências. A direção — por que algo importa, que sensação merece existir e qual risco de produção é aceitável — continua sendo sua.
