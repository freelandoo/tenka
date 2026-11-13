# Lote 2 — Conteúdo de topo de funil (TENKA Tech)

> **Status: RASCUNHO para revisão humana. Nada aqui está publicado nem versionado no site.**
> Antes de virar página no ar, cada texto precisa de: (1) checagem de fatos, (2) validação de promessas,
> (3) revisão de título/descrição/schema. Os pontos marcados **⚠️ VERIFICAR** são onde eu posso ter
> assumido algo — confirme ou corrija.

## Decisão estrutural que depende de você (1 item)

O site hoje **não tem seção de conteúdo** — só home, divisões, páginas de serviço, páginas de preço e legais
(`src/seo/routes.ts`). Páginas de problema/topo de funil precisam de um lugar novo. Proposta:

- **Nova seção `/guias/<slug>`** (hub de conteúdo, uma entrada por guia).
- Mesma mecânica das páginas atuais: entram em `ROUTES`, geram HTML estático, sitemap, FAQ JSON-LD, rewrite no `vercel.json`.
- Vantagem: não polui os paths de serviço (`/tech/...`) e escala para Studios/Games depois.
- Alternativa, se preferir manter tudo sob Tech: `/tech/guias/<slug>`.

**Só implemento as páginas depois que você (a) aprovar os fatos abaixo e (b) escolher a URL.**

Cada guia fecha empurrando para o serviço certo e para o WhatsApp — a conversão que o site todo busca.

---

# Guia 1 — Solução pronta vs. sistema sob medida

- **URL proposta:** `/guias/solucao-pronta-ou-sistema-sob-medida`
- **Intenção de busca:** quem já sentiu o limite de uma ferramenta de prateleira e pesquisa se vale mandar fazer o próprio. Decisão, não marca.
- **Serviço de destino:** [/tech/sistemas-sob-medida](https://www.tenkagroup.com.br/tech/sistemas-sob-medida) + [/tech/sistemas-sob-medida/quanto-custa](https://www.tenkagroup.com.br/tech/sistemas-sob-medida/quanto-custa)

**Title** (58): `Solução pronta ou sistema sob medida? Como decidir`
**Meta description** (152): `Ferramenta de prateleira ou sistema sob medida? Veja o que cada caminho resolve, onde cada um trava e as perguntas que apontam a escolha certa pro seu negócio.`
**H1:** `Solução pronta ou sistema sob medida: como saber qual o seu caso`

**Intro:**
Quase todo processo começa cabendo numa ferramenta pronta — e a maioria deveria continuar assim. Software de prateleira é mais barato, entra em operação hoje e já foi testado por milhares de empresas antes de você. O problema aparece quando o negócio cresce e passa a trabalhar *para* a ferramenta: gambiarra em planilha para dar conta do que ela não faz, dado digitado duas vezes, processo que todo mundo sabe de cor porque o sistema não registra. Este guia é para decidir a hora de parar de forçar a prateleira — e quando ainda não é essa hora.

**Seções:**

1. **O que a solução pronta resolve bem.** Problemas comuns e já resolvidos — emitir nota, cobrar, agendar, vender online. Se o seu processo é padrão de mercado, sob medida quase sempre é desperdício. Pagar para reconstruir o que o mercado já entrega barato é o erro mais caro.
2. **Os três sinais de que a prateleira travou.** (a) Você mantém uma planilha paralela para cobrir o que o sistema não faz; (b) o mesmo dado é digitado em dois lugares porque as ferramentas não conversam; (c) uma regra do seu negócio simplesmente não existe em nenhum software — é regra sua, não do mercado. Um sinal pode ser contornável. Os três juntos custam horas toda semana.
3. **O que o sob medida é de verdade — e o que não é.** É um sistema que fala a língua do seu processo, integra o que já existe e cresce junto. Não é "igual ao concorrente, mas meu": copiar um software pronto do zero costuma ser a pior das duas opções — caro como sob medida, limitado como prateleira. O sob medida se justifica pela *diferença*, não pela posse.
4. **O caminho híbrido, que é o mais comum.** Na prática raramente é tudo-ou-nada: mantém-se a ferramenta pronta no que ela é boa e constrói-se sob medida só a camada que dá vantagem — normalmente ligadas por automação e integração. Começa menor e mais barato do que trocar tudo.
5. **Como a TENKA conduz.** Antes de orçar, a gente mapeia o processo e olha se prateleira, integração ou sistema próprio resolve — inclusive quando a resposta é "continue no que você já tem". O custo de um sistema sob medida vem do escopo e das integrações, não de uma tabela; é por isso que ele é orçado depois de uma conversa, e não vendido por plano. → ver [quanto custa um sistema sob medida](https://www.tenkagroup.com.br/tech/sistemas-sob-medida/quanto-custa).

**CTA:** Mande no WhatsApp o processo que está travando hoje — a gente responde dizendo se o caso pede prateleira, integração ou sistema sob medida.

**FAQ (vira FAQPage JSON-LD):**
- *Sistema sob medida é sempre mais caro que um pronto?* No preço de entrada, quase sempre sim — a prateleira dilui o custo entre milhares de clientes. A conta muda quando você soma o que a ferramenta pronta custa de forma escondida: horas em retrabalho manual, planilhas paralelas e processos que não escalam. O sob medida se paga quando essa perda é maior que a mensalidade.
- *Dá para começar pequeno?* Sim, e costuma ser o certo. Em vez de reconstruir tudo, constrói-se primeiro a parte que mais trava e liga-se ao que já funciona. ⚠️ VERIFICAR: confirmar que "entrega em etapas / MVP primeiro" descreve como vocês realmente tocam projeto.
- *Vale copiar um software que eu já uso, só que meu?* Raramente. Refazer do zero o que o mercado já entrega pronto junta o pior dos dois mundos. O sob medida compensa onde o seu processo é diferente do mercado — não onde ele é igual.

**⚠️ VERIFICAR neste guia:** o modelo de entrega em etapas; se "mapeamos o processo antes de orçar" descreve o método real.

---

# Guia 2 — Quando vale a pena automatizar o atendimento no WhatsApp

- **URL proposta:** `/guias/quando-automatizar-atendimento-no-whatsapp`
- **Intenção de busca:** dono/gestor afogado em mensagens repetidas, pesquisando se "bot de WhatsApp" resolve — e com medo de robotizar o atendimento.
- **Serviço de destino:** [/tech/automacoes-e-agentes-de-ia](https://www.tenkagroup.com.br/tech/automacoes-e-agentes-de-ia) + [/tech/automacoes-e-agentes-de-ia/quanto-custa](https://www.tenkagroup.com.br/tech/automacoes-e-agentes-de-ia/quanto-custa)

**Title** (56): `Quando vale a pena automatizar o WhatsApp da empresa`
**Meta description** (149): `Nem todo atendimento no WhatsApp precisa de bot. Veja quais mensagens compensa automatizar, quando entra IA de verdade e o que nunca tirar do humano.`
**H1:** `Quando vale a pena automatizar o atendimento no WhatsApp (e quando não)`

**Intro:**
O WhatsApp virou a principal porta de entrada da maioria dos negócios — e, junto, a maior fonte de interrupção. A mesma pergunta sobre horário, preço e disponibilidade chega dezenas de vezes por dia, e cada uma tira alguém de uma tarefa que rende mais. A tentação é "colocar um bot". Mas automação mal colocada afasta cliente mais rápido do que atendimento lento. Este guia separa o que compensa automatizar do que precisa continuar humano — e mostra onde entra IA de verdade e onde ela é só custo.

**Seções:**

1. **O que quase sempre compensa automatizar.** Respostas a perguntas repetidas e previsíveis: horário, endereço, formas de pagamento, status de pedido, agendamento. São mensagens de resposta única, que não exigem julgamento — exatamente onde a automação devolve tempo sem piorar a experiência.
2. **Onde a automação atrapalha.** Negociação, reclamação, venda complexa, cliente irritado. Tentar automatizar julgamento e empatia gera a pior experiência possível: o cliente percebe o robô justo na hora em que mais precisava de uma pessoa. A boa automação sabe a hora de passar a conversa para um humano — e passa.
3. **Fluxo vs. agente de IA — não é a mesma coisa.** A maior parte do ganho vem de **fluxo**: um roteiro de respostas e botões, barato e previsível, que resolve o repetitivo. **Agente de IA** (que interpreta linguagem livre e decide a resposta) só se justifica quando as perguntas são variadas demais para um roteiro dar conta. Começar por IA onde um fluxo resolveria é pagar caro por complexidade que você não precisa.
4. **O teste de uma pergunta.** Olhe as mensagens da última semana e conte: quantas são as *mesmas* cinco ou seis perguntas? Se a maioria é, um fluxo resolve e se paga rápido. Se cada conversa é diferente, aí a conversa é outra — e talvez de IA. ⚠️ VERIFICAR: ok usar "olhe seu histórico da semana" como método sugerido?
5. **Ferramenta pronta vs. sob medida, aqui também.** Existe plataforma de chatbot pronta e barata — para muitos casos ela basta. O sob medida entra quando a automação precisa ler dados do seu sistema (estoque, pedido, agenda) para responder certo, ou acionar processos internos. Aí vira integração, não bot.
6. **Como a TENKA conduz.** A gente começa pelo caso real: que mensagens chegam, quais têm resposta única, onde tem que entrar gente. Só então define se é fluxo, agente de IA, ferramenta pronta ou integração sob medida. → ver [quanto custa automatizar atendimento e processos](https://www.tenkagroup.com.br/tech/automacoes-e-agentes-de-ia/quanto-custa).

**CTA:** Manda no WhatsApp as três perguntas que mais se repetem no seu atendimento — a gente responde dizendo se dá para automatizar com um fluxo simples ou se o seu caso pede mais.

**FAQ (vira FAQPage JSON-LD):**
- *Automatizar o WhatsApp deixa o atendimento robótico?* Deixa, se automatizar a coisa errada. A ideia é o contrário: a automação assume o repetitivo e previsível para que a pessoa sobre para as conversas que realmente precisam de gente. Automação boa sabe quando chamar o humano.
- *Preciso de inteligência artificial para isso?* Na maioria dos casos, não de cara. Um fluxo de respostas resolve o grosso do repetitivo e é mais barato e previsível. IA entra quando as perguntas são variadas demais para um roteiro.
- *Automação de WhatsApp pode ser bloqueada ou dar problema de conta?* O WhatsApp tem regras próprias para mensagens automatizadas e para a API oficial. ⚠️ VERIFICAR: redação desta resposta precisa de confirmação técnica de vocês sobre uso da API oficial/limites — não quero afirmar algo errado sobre política do WhatsApp.

**⚠️ VERIFICAR neste guia:** o método "olhe o histórico da semana"; a resposta sobre regras/API do WhatsApp; se vocês entregam tanto fluxo simples quanto agente de IA (os dois estão no serviço?).

---

# Guia 3 — Como reduzir a dependência de tráfego pago

- **URL proposta:** `/guias/reduzir-dependencia-de-trafego-pago`
- **Intenção de busca:** dono que sente que "o dia que parar de pagar anúncio, para de vender" e procura alternativa — canal próprio, orgânico.
- **Serviço de destino:** [/tech/sites](https://www.tenkagroup.com.br/tech/sites) + [/precos](https://www.tenkagroup.com.br/precos)

**Title** (57): `Como reduzir a dependência de tráfego pago aos poucos`
**Meta description** (156): `Depender só de anúncio deixa o negócio refém do custo por clique. Veja como construir canais próprios — site, orgânico e base — sem desligar o pago de uma vez.`
**H1:** `Como reduzir a dependência de tráfego pago (sem desligar tudo de uma vez)`

**Intro:**
Anúncio funciona — e é por isso que vicia. Você paga, aparece, vende; para de pagar, some. O problema não é o tráfego pago em si: é ele ser a *única* fonte de clientes. Quando o custo por clique sobe (e ele sobe), a margem aperta e não há o que fazer além de pagar mais. Este guia é sobre construir canais que continuam trazendo cliente quando o anúncio está desligado — sem a ilusão de que isso acontece rápido ou de graça.

> **Nota honesta:** orgânico e canal próprio são construção de médio prazo. Ninguém sério promete primeira posição no Google ou prazo garantido — quem promete, está vendendo ilusão. O que dá para prometer é método e consistência, não posição.

**Seções:**

1. **Por que depender só do pago é frágil.** No tráfego pago, o cliente é alugado: ele vem enquanto você paga e some quando para. O custo por clique é definido por leilão — concorrente novo entra, o preço sobe, e você não controla isso. Um negócio que só tem esse canal não tem um ativo, tem uma assinatura que precisa renovar todo mês para existir.
2. **O que é um canal próprio.** É todo caminho até o cliente que não depende de pagar por clique recorrente: um site que é encontrado por quem busca o que você resolve, uma base de contatos que é sua, presença em busca e em ferramentas de IA. Dá trabalho para construir, mas depois de pronto não some quando o orçamento de anúncio acaba.
3. **O site como base — não como panfleto.** A maioria dos sites é um folder digital: bonito, parado, invisível para quem busca. Um site pensado para ser *encontrado* tem uma página por problema que você resolve, estrutura que o Google e as ferramentas de IA conseguem ler, e um caminho claro até o contato. É a diferença entre ter um endereço e ter uma vitrine na rua movimentada.
4. **A regra de não desligar o pago de uma vez.** Reduzir dependência não é cortar o anúncio amanhã — é construir o orgânico *enquanto* o pago ainda sustenta a venda, e ir transferindo peso conforme o próprio começa a trazer. Desligar antes de ter o substituto é trocar um problema por outro pior.
5. **O que realmente leva tempo (e o que não).** Estrutura técnica e as primeiras páginas de problema saem em semanas. Ganhar tração em busca orgânica é medido em meses e depende de consistência — não de um truque. Quem vende resultado garantido em 30 dias está vendendo o que não controla.
6. **Como a TENKA conduz.** A gente constrói o site já preparado para busca orgânica — cada página com título, descrição e estrutura pensados para ser encontrado — e a hospedagem mantém isso no ar e indexável. Não é promessa de posição; é a base técnica sem a qual nenhum orgânico acontece. → ver [planos e hospedagem](https://www.tenkagroup.com.br/precos) e [sites que convertem](https://www.tenkagroup.com.br/tech/sites).

**CTA:** Manda no WhatsApp de onde vêm seus clientes hoje — a gente responde com um caminho realista para começar a construir um canal que não depende de anúncio.

**FAQ (vira FAQPage JSON-LD):**
- *Dá para parar de anunciar e viver só de orgânico?* Para muitos negócios, não — e tudo bem. O objetivo realista não é zerar o pago, é parar de depender *só* dele, para que uma alta no custo por clique não ameace a operação. Pago e orgânico funcionam melhor juntos.
- *Em quanto tempo o orgânico começa a trazer cliente?* Não há prazo garantido, e desconfie de quem dá um. A base técnica fica pronta em semanas; tração em busca é questão de meses e de consistência. Qualquer promessa de primeira posição no Google em prazo fixo é falsa.
- *Um site novo já resolve?* O site é a base, não a solução inteira. Ele precisa ser construído para ser encontrado — página por intenção de busca e estrutura legível para Google e IA — e sustentado ao longo do tempo. Um site parado não traz tráfego sozinho.

**⚠️ VERIFICAR neste guia:** nada factual arriscado — mas confirme se o tom "não prometemos posição no Google" está alinhado com como vocês vendem (é a regra do prompt mestre, mantive à risca).

---

## Resumo para decidir

| Guia | URL proposta | Empurra para | Risco de fato |
|---|---|---|---|
| Pronto vs. sob medida | `/guias/solucao-pronta-ou-sistema-sob-medida` | sistemas-sob-medida + quanto-custa | baixo — confirmar modelo de entrega em etapas |
| Automatizar WhatsApp | `/guias/quando-automatizar-atendimento-no-whatsapp` | automacoes-e-agentes-de-ia + quanto-custa | médio — confirmar resposta sobre API/regras do WhatsApp |
| Reduzir tráfego pago | `/guias/reduzir-dependencia-de-trafego-pago` | sites + precos | baixo — só confirmar tom anti-promessa |

**Próximo passo, na sua mão:**
1. Revisar os fatos marcados **⚠️ VERIFICAR** e corrigir o que estiver errado.
2. Escolher a URL (`/guias/...` ou `/tech/guias/...`).
3. Dizer "implementa" — aí eu crio a seção de guias em `routes.ts`, wiro cada página (HTML estático + FAQ JSON-LD + rewrite no `vercel.json`) e valido antes de qualquer commit.

Nada disso vai para o site sem esses três passos.
