# Auditoria de SEO, benchmark competitivo e conversão — TENKA

**Data da coleta:** 8 de outubro de 2026
**Domínio auditado:** `https://www.tenkagroup.com.br`
**Escopo:** 27 URLs do sitemap, código do frontend (`frontend/src/seo/`, páginas e
componentes), concorrentes orgânicos em 6 clusters de busca.

---

## 0. Limitações desta auditoria (leia antes dos números)

Nenhuma afirmação abaixo sobre volume de busca, posição ou tráfego é inventada.
Onde não havia dado, está escrito que não havia.

| Fonte | Status | Consequência |
|---|---|---|
| Google Search Console | **Sem acesso** | Não há impressões, CTR, posição média nem consultas reais. A propriedade está verificada (tag no HTML), então os dados existem — só não chegam aqui. |
| Google Analytics 4 | **Sem acesso** | GA4 está instalado (`G-XWSJ1D2BXZ`) com Consent Mode v2 e eventos próprios, mas não foi possível ler origem de tráfego, páginas de entrada ou conversões. |
| Ahrefs / Semrush / SimilarWeb | **Não autorizados** nesta sessão | Sem volume de busca, dificuldade de palavra-chave ou perfil de backlinks. |
| PageSpeed Insights API | **Cota diária esgotada** | Métricas de performance foram medidas direto no navegador (Playwright/Chromium, viewport 412×915). São dados de laboratório reais, mas não são o Lighthouse oficial nem dados de campo (CrUX). |
| Windsor.ai | Conectado, mas só com uma conta de **Instagram pessoal** (`vitinhoempresario`) | Nenhum conector de GSC/GA4 ligado. |

**Para fechar as lacunas:** autorizar os conectores do Search Console e do GA4
(via configurações de conectores da claude.ai) é o que transforma este plano de
"fundamentado em evidência pública" para "fundamentado em dados do seu funil".
Enquanto isso, as prioridades abaixo se apoiam em defeitos técnicos verificáveis
e em comparação direta com páginas que já ranqueiam.

---

## 1. Resumo executivo

O site da TENKA não tem um problema de SEO técnico. Tem um problema de
**prova, de ligação interna e de entrega da promessa da busca** — e um defeito
de performance concentrado numa única página.

### O que já está acima da média do mercado

A fundação técnica é boa e, em alguns pontos, melhor do que a dos concorrentes
que ranqueiam hoje:

- Prerender estático por rota (`scripts/seo-plugin.ts` + `src/seo/routes.ts`),
  com `<title>`, `description`, canonical, OG e JSON-LD corretos no HTML servido.
- JSON-LD honesto: `Organization`, `WebSite`, `Service`, `BreadcrumbList`,
  `FAQPage`, `ProfessionalService`. Sem `aggregateRating` nem `review` inventados.
  Isso é raro e é um ativo — não mexa.
- `robots.txt` que libera deliberadamente GPTBot, PerplexityBot, ClaudeBot e
  afins. Decisão correta para ser citado em respostas geradas.
- Sitemap limpo, canonical consistente, 308 permanentes já resolvendo
  canibalização real (`/games/jogos-de-navegador` → `/games/advergame-e-gamificacao`).
- NAP centralizado em `src/config/contact.ts` com a decisão certa de **não**
  publicar logradouro (negócio de área de atendimento, não loja).
- Performance das páginas de serviço: LCP de 108 ms e CLS de 0,012 em
  `/tech/sites`. Isso é excelente.

### Os cinco problemas que custam dinheiro

1. **A home não é uma página — é uma vitrine sem saída.** 71 palavras
   renderizadas, nenhum H2, nenhuma proposta de valor em texto, nenhum CTA de
   contato. E os itens de menu "Games", "Studios" e "Tech" são `<button>` sem
   `href`: a página mais forte do site **não passa link para duas das três
   divisões**. LCP medido de **18,4 s** e CLS de **0,183** (o carrossel
   automático fica redefinindo o candidato a LCP).
2. **Não existe uma única prova.** `/projetos` tem 101 palavras rastreáveis,
   nenhum cliente nomeado, três IPs próprios marcados como "em produção",
   "protótipo jogável" e "em pesquisa", e a divisão Tech diz "em publicação —
   fale com a gente". O concorrente que lidera as mesmas buscas publica Itaú,
   Netflix, Heineken, iFood e Coca-Cola na home.
3. **As páginas `/quanto-custa` não entregam o que a busca promete.** Três das
   quatro não têm **nenhum valor em R$**. Pior: todas exibem o bloco "Sobre os
   números desta página", que isenta a TENKA de números que não existem na
   página. Quem ranqueia para essas consultas publica tabela completa em
   ~3.000 palavras.
4. **As páginas de divisão são silos sem porta de saída.** `/games` não tem um
   único `<a>` para `/contato`, `/projetos`, `/sobre`, `/studios` ou `/tech`.
   Todos os CTAs são `<button>` que abrem o modal de briefing. Os três cards de
   jogos têm "EXPLORAR UNIVERSO ↗" que não leva a lugar nenhum.
5. ~~**Nenhum lead é gravado.**~~ **Resolvido em 08/10/2026** — ver "Correções já
   aplicadas" abaixo. O briefing de 5 passos e o formulário de `/contato`
   terminavam abrindo `wa.me` ou `mailto:`; se o handoff falhasse, o lead
   evaporava — e o evento `lead` do GA4 disparava na *intenção*, não na entrega.

### A oportunidade que ninguém no mercado está ocupando

As páginas de NR (`/games/treinamento-em-realidade-virtual/nr-35-...`, `nr-33`,
`nr-10`) são, de longe, o melhor ativo do site: 830–1.036 palavras, ficha
normativa com carga horária e modalidade, disclaimer explícito de que a TENKA
não é escola de segurança e não emite certificado, e **citação correta e
atualizada da legislação**.

Verifiquei as duas portarias citadas e as duas são reais e estão corretamente
descritas:

- **Portaria MTE nº 1.259/2026** (DOU 16/07/2026) incluiu o item 35.4.5: os
  treinamentos da NR-35 passam a ser **exclusivamente presenciais**, com um ano
  de transição. ([RS Data](https://www.rsdata.com.br/portaria-mte-1259-2026-nr35-treinamento-presencial-escadas/), [SOC](https://www.soc.com.br/blog-de-sst/nr-35-muda-regras-para-treinamentos-em-trabalho-em-altura-entenda-o-que-muda-com-a-portaria-mte-no-1-259-2026/), [texto oficial no gov.br](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2026-1/portaria-mte-no-1-259-alteracao-do-anexo-iii-da-nr-35.pdf/@@download/file))
- **Portaria MTE nº 737/2026** (DOU 01/06/2026) aprovou o novo texto da NR-10,
  com vigência em 01/06/2027. ([Normas Legais](https://www.normaslegais.com.br/legislacao/portaria-mte-737-2026.htm), [texto oficial no gov.br](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2026-1/portaria-mte-no-737-nova-nr-10.pdf))

Isso é vento a favor direto: a 1.259/2026 **eliminou o mercado de NR-35 100%
EAD** e valorizou quem consegue entregar prática presencial de qualidade — que é
exatamente onde o simulador entra. Nenhum dos fornecedores de VR encontrados nas
buscas trata dessa mudança. Esse é o cluster para atacar primeiro.

### O problema de identidade da marca

Três observações que precisam de uma decisão sua, não minha:

- O endereço que você passou no briefing, `grupotenka.com.br`, **não existe**
  (NXDOMAIN em consulta ao 8.8.8.8). O site vive em `www.tenkagroup.com.br`.
- A marca está escrita de três jeitos diferentes: domínio `tenkagroup`, e-mail
  `grupotenka@gmail.com`, Instagram `@grupo.tenka`. Isso enfraquece o
  reconhecimento de entidade por buscador e por motor de IA, que cruzam esses
  sinais.
- O e-mail comercial de um grupo de tecnologia B2B é um **@gmail.com**. Para quem
  está decidindo contratar um simulador de NR ou um sistema sob medida, isso
  pesa contra.

Busca pela marca ("Tenka Group grupo de tecnologia e entretenimento São Paulo")
não retorna o site. "Tenka" colide com *Codename: Tenka* (jogo da Psygnosis de
1997) e com uma empresa chinesa homônima. Não consegui confirmar o estado de
indexação sem o Search Console.

---

## 1.1 Correções já aplicadas

### Persistência de lead — item 3 da matriz (08/10/2026)

O briefing e o formulário de `/contato` passaram a gravar o lead antes do
handoff para WhatsApp/e-mail.

| Arquivo | O que mudou |
|---|---|
| `backend/migrations/0030_site_leads.sql` | Tabela `public.site_leads` — solta, sem FK (um lead existe antes de qualquer cadastro). Guarda `message` (o texto enviado), `answers` (jsonb cru do briefing) e `page_path` (qual página originou o lead) |
| `backend/src/modules/leads.ts` | `POST /leads` público com honeypot, rate limit por IP (5 / 10 min) e tetos de tamanho no zod; `GET /leads` com `staffOnly` |
| `backend/src/index.ts` | Registro da rota |
| `frontend/src/lib/api/leads.ts` | `saveLead()` — `fetch` com `keepalive`, nunca lança. Não usa o `apiFetch` do painel: um 401 vindo daqui não pode derrubar a sessão de quem está com o painel aberto |
| `frontend/src/components/brief/BriefModal.tsx` | `submit()` grava e só então dispara `generate_lead`. A janela do WhatsApp abre **antes** do `await` — depois dele o navegador deixa de tratar a abertura como consequência do clique e o bloqueador de popup barra a aba |
| `frontend/src/pages/ContactPage.tsx` | Mesma mudança, **mais um campo de e-mail obrigatório**: o formulário coletava nome, empresa e texto, e a identidade vinha do próprio número do WhatsApp. Com registro em banco, um lead sem e-mail e sem handoff concluído é uma linha que não dá para responder |
| `frontend/src/lib/analytics.ts` | `trackLead(method, source, stored)` — o GA4 passa a separar lead recuperável de handoff às cegas |

**O que isso muda na medição:** `generate_lead` com `stored: true` é lead que
está no banco e pode receber retorno mesmo se o WhatsApp falhou. Com
`stored: false`, o contato dependeu inteiramente do handoff. A diferença entre
os dois grupos é a métrica da Fase 1 que antes era impossível de obter.

**O que continua fora de escopo:** não há UI de leads no painel (`GET /leads`
existe, tela não), não há notificação por e-mail (o WhatsApp já avisa em tempo
real) e não há captcha (atrito num formulário que já tem cinco passos).

---

## 2. Inventário das páginas analisadas

Palavras = conteúdo rastreável dentro de `#root` no HTML servido (inclui a lista
de navegação do rodapé de fallback, ~60–100 palavras). Links = âncoras internas
no HTML estático.

| URL | HTTP | Palavras | Links | Avaliação |
|---|---|---|---|---|
| `/` | 200 | 180 | 7 | **Crítico** — 71 palavras no DOM renderizado, 0 H2 |
| `/games` | 200 | 251 | 15 | Fina; 540 palavras renderizadas, 0 link de saída |
| `/studios` | 200 | 218 | 13 | Fina; mesmo padrão de silo |
| `/tech` | 200 | 191 | 12 | Fina; mesmo padrão de silo |
| `/projetos` | 200 | 101 | 7 | **Crítico** — sem cliente, sem case real |
| `/sobre` | 200 | 109 | 7 | **Crítico** — sem equipe, sem história, sem E-E-A-T |
| `/contato` | 200 | 317 | 7 | OK; `ProfessionalService` + `FAQPage` corretos |
| `/games/treinamento-em-realidade-virtual` | 200 | 926 | 15 | **Melhor página do site** |
| `.../nr-35-trabalho-em-altura` | 200 | 1.036 | 15 | **Melhor página do site** |
| `.../nr-33-espaco-confinado` | 200 | 830 | 15 | Forte |
| `.../nr-10-seguranca-em-eletricidade` | 200 | 942 | 15 | Forte |
| `/games/ativacao-de-marca-em-realidade-virtual` | 200 | 750 | 15 | Boa, sem prova |
| `/games/advergame-e-gamificacao` | 200 | 819 | 15 | Boa, sem prova |
| `/games/jogos-mobile` | 200 | 660 | 15 | Boa, intenção comercial fraca |
| `/studios/animacao-3d` | 200 | 595 | 13 | Fina para o cluster |
| `/studios/maquete-eletronica-3d` | 200 | 625 | 13 | Fina — concorrência forte e visual |
| `/studios/mockup-3d-de-produto` | 200 | 631 | 13 | Boa, nicho menos disputado |
| `/studios/identidade-visual-e-branding` | 200 | 646 | 13 | Boa |
| `/tech/automacoes-e-agentes-de-ia` | 200 | 786 | 12 | Boa, mercado lotado |
| `/tech/sistemas-sob-medida` | 200 | 655 | 12 | Boa |
| `/tech/aplicativos` | 200 | 625 | 12 | Boa |
| `/tech/sites` | 200 | 687 | 12 | Boa (417 renderizadas) |
| `/games/treinamento-em-realidade-virtual/quanto-custa` | 200 | 893 | 15 | Sem valores |
| `/studios/maquete-eletronica-3d/quanto-custa` | 200 | 683 | 13 | Sem valores |
| `/studios/identidade-visual-e-branding/quanto-custa` | 200 | 727 | 13 | Único com referência de mercado |
| `/tech/sites/quanto-custa` | 200 | 772 | 12 | Sem valores |
| `/politica-de-privacidade` | 200 | 1.302 | 7 | OK |

**Ausentes do site:** páginas de case individuais, qualquer conteúdo
informacional/blog, páginas de equipe, páginas geográficas legítimas.

**URL inexistente:** `/pagina-que-nao-existe` responde **HTTP 200** com o
`<title>`, a `description` e o canonical da home, e `robots: index, follow` no
HTML inicial. `NotFoundPage.tsx` aplica `useNoindex()` só em runtime — funciona
se o Google renderizar, mas o sinal inicial é de soft 404.

**`/painel`:** header `X-Robots-Tag: noindex, nofollow` (correto) convivendo com
`<meta name="robots" content="index, follow">` no HTML. Sinais contraditórios; o
Google aplica o mais restritivo, mas a contradição deve sumir. O link "Painel"
também está no menu principal de todas as páginas públicas.

---

## 3. Benchmark competitivo

Concorrentes escolhidos por aparecerem organicamente nas buscas comerciais que a
TENKA quer disputar. **Ranking e estrutura de página são observáveis; taxas de
conversão não são** — nada abaixo afirma conversão de terceiro.

### 3.1 Casa Mais — o concorrente a bater (VR + ativações)

`agenciacasamais.com.br` — aparece em primeiro para "jogos em realidade virtual
para empresas" e para ativações de marca em VR.

| Item | O que faz |
|---|---|
| **Serviços / palavras-chave** | VR, AR, Metaverso, IA, Realidade Mista — uma página dedicada por tecnologia |
| **Arquitetura** | 5 páginas de tecnologia + cases + trajetória, todas linkadas da home |
| **Copy** | H1 "Tecnologias Imersivas para empresas"; título "Pioneira em Realidade Virtual no Brasil" |
| **Argumentos** | 15 anos de mercado, +200 projetos, +80 marcas, operação em SP desde 2011 e no Porto desde 2022 |
| **Prova social** | Clientes nomeados com logo: Itaú, Netflix, Heineken, iFood, Coca-Cola, Petrobras, Natura, Syngenta, Wickbold, Ovomaltine, União Química, Record |
| **CTAs** | "Fale com o CEO da Casa Mais" (WhatsApp, topo), "Fale com a Casa Mais" (hero), um CTA por seção de serviço |
| **Links internos** | Home → cada tecnologia → cases; fluxo fechado |
| **Pontos fracos** | Não trata a questão regulatória das NRs; posicionamento genérico de "tecnologias imersivas"; sem página de preço |

**O que dá para superar:** a Casa Mais vende *tecnologia*. A TENKA já escreveu
páginas que vendem *conformidade com a norma* — NR-35, NR-33, NR-10, com carga
horária, modalidade e portaria citada. Quem busca "treinamento NR-35 realidade
virtual" tem um problema de compliance, não de tecnologia. Esse é o ângulo.

**O que precisa ser copiado como princípio (não como texto):** o bloco de prova.
Número de projetos, anos de operação e clientes nomeados aparecem antes do
primeiro scroll.

### 3.2 Pixel Blend — benchmark de página de preço (maquete 3D)

`pixelblend.com.br/preco-maquete-eletronica/` — ranqueia para "quanto custa
maquete eletrônica".

- **~3.000–3.500 palavras**, 9 seções H2 numeradas com 2–4 H3 cada.
- **Publica números:** "R$ 500,00 a mais de R$ 50.000,00"; "R$ 1.500,00 a
  R$ 5.000,00 por render"; taxa de urgência de 20–50%; pagamento 50/50;
  2–3 rodadas de revisão inclusas.
- **FAQ de 10 perguntas** comerciais.
- CTAs de WhatsApp no header, no meio e no rodapé.
- **Fraquezas exploráveis:** nenhum cliente nomeado, nenhum case, nenhum
  depoimento; numeração de seção duplicada (dois "8."); taxa de urgência
  inconsistente entre o corpo (20–50%) e o FAQ (30–50%); uma resposta do FAQ
  responde à pergunta errada.

### 3.3 O SERP de "quanto custa um site profissional"

Dez resultados, quase todos **blogs de agências pequenas** (Levolu, Agência DBox,
Safira Design, Upsites, Macan, Loy Digital, Vork, Nimbus, AZZ, Estou Apta).

A referência estrutural, [Levolu](https://levolu.com.br/blog/quanto-custa-criar-site-profissional-2026):
~3.000 palavras, 16 min de leitura, 7 H2, e uma tabela de faixas por tipo de
projeto e por perfil de executor — de R$ 300–800 (DIY) a R$ 15.000–50.000+
(agência especializada), mais custos recorrentes (hospedagem R$ 50–200/mês,
manutenção R$ 150–800/mês, hora extra-escopo R$ 80–250).

**Leitura estratégica:** esse SERP é disputado por autoridade baixa. Uma página
da TENKA com faixas reais, fontes citadas e a honestidade que o texto atual já
tem venceria em qualidade. Hoje ela não compete porque **não responde à
pergunta**.

### 3.4 Maquete eletrônica 3D — mercado visual e consolidado

Render Fabrik, Pixel Blend, 3D Pictures, SET 3D, Comunica 3D, 3dmaquetes,
Vizyro. Todos com **portfólio extenso e visível** como argumento central; vários
oferecem tour 360 e maquete interativa em VR.

**Avaliação honesta:** este é o cluster mais difícil para a TENKA. É um mercado
onde a decisão é visual e o portfólio é o produto. `/studios/maquete-eletronica-3d`
tem 625 palavras e nenhuma imagem de projeto entregue. Sem portfólio, a página
não converte por melhor que seja o texto.

**Diferencial disponível:** a conexão com a TENKA Games. Ninguém nesse mercado
entrega maquete *e* experiência interativa em VR para stand de vendas sob a mesma
direção. A Comunica 3D é a que mais se aproxima.

### 3.5 Advergame e ativação de marca

Casa Mais, [4VR](https://4vr.com.br/), [Lou Studios](https://www.loustudios.com.br/)
(que mantém blog técnico sobre advergame 3D em navegador),
[Agência Primeira Página](https://agenciaprimeirapagina.com.br/realidade-aumentada).

Padrão do mercado: cases de marca grande + formato pré-empacotado ("Ninja VR",
"quiz gamificado"). A TENKA vende mecânica sob medida — posicionamento melhor,
mas mais difícil de provar sem case.

### 3.6 Automação e agentes de IA

O cluster mais lotado e menos defensável: Price Tecnologia, Level Group,
Venturus, Intelecta, NexAi, Toolzz, autia.ai, Artycs, AgenFlow, além de
diretórios de fornecedores. Vários oferecem diagnóstico gratuito de 45 min como
isca.

**Recomendação:** não priorizar SEO aqui. É um mercado de mídia paga e indicação.
Mantenha a página como suporte de conversão para quem já conhece a TENKA.

### 3.7 Conteúdo normativo de NR — o espaço vazio

Quem ranqueia para a legislação das NRs são **portais de SST** (RS Data, SOC,
Revista CIPA, Guia Trabalhista, Animaseg, Rescue Cursos, Inbraep) e **escolas de
curso** — não fornecedores de VR. Nenhum fornecedor de VR encontrado nas buscas
publica a leitura regulatória atualizada.

A TENKA já tem essa leitura escrita e correta nas três páginas de NR. Falta
transformá-la em cluster: conteúdo informacional que capture quem busca a norma
e encaminhe para a página de solução.

---

## 4. Mapa estratégico de palavras-chave

**Sem dados de volume.** A coluna "Demanda" é uma estimativa qualitativa baseada
na quantidade e na maturidade das páginas que disputam cada termo nas buscas que
executei — não é número de ferramenta. A coluna "Concorrência" segue o mesmo
critério.

### Cluster A — Treinamento em VR e NRs (prioridade máxima)

| Termo | Intenção | Funil | Demanda | Concorrência | Página |
|---|---|---|---|---|---|
| treinamento em realidade virtual para empresas | Investigação comercial | Meio | Média | Média | `/games/treinamento-em-realidade-virtual` ✅ |
| treinamento NR-35 realidade virtual | Transacional | Fundo | Baixa | **Baixa** | `/.../nr-35-trabalho-em-altura` ✅ |
| treinamento NR-33 realidade virtual | Transacional | Fundo | Baixa | **Baixa** | `/.../nr-33-espaco-confinado` ✅ |
| treinamento NR-10 realidade virtual | Transacional | Fundo | Baixa | **Baixa** | `/.../nr-10-...` ✅ |
| NR-35 treinamento presencial obrigatório / portaria 1.259 | Informacional | Topo | **Alta e crescente** | Média (portais de SST) | **Nova** — artigo de apoio |
| nova NR-10 2026 / portaria 737 o que muda | Informacional | Topo | **Alta e crescente** | Média | **Nova** — artigo de apoio |
| simulador de segurança do trabalho em VR | Invest. comercial | Meio | Baixa | Baixa | `/games/treinamento-em-realidade-virtual` |
| quanto custa treinamento em realidade virtual | Transacional | Fundo | Baixa | Baixa | `/.../quanto-custa` ⚠️ sem valores |

**Por que este cluster primeiro:** é o único em que a TENKA tem conteúdo
superior ao de quem ranqueia, o ticket é alto, o comprador é corporativo e
recorrente, e há um gatilho regulatório ativo com prazo (16/07/2027 para refazer
treinamento de NR-35 feito a distância).

### Cluster B — Maquete, animação e mockup 3D

| Termo | Intenção | Funil | Demanda | Concorrência | Página |
|---|---|---|---|---|---|
| maquete eletrônica 3D | Invest. comercial | Meio | Alta | **Alta** | `/studios/maquete-eletronica-3d` |
| quanto custa maquete eletrônica | Transacional | Fundo | Média | Alta | `/.../quanto-custa` ⚠️ sem valores |
| maquete eletrônica para lançamento imobiliário | Transacional | Fundo | Média | Alta | `/studios/maquete-eletronica-3d` |
| maquete interativa em VR para stand de vendas | Transacional | Fundo | Baixa | **Baixa** | **Nova** — cruza Studios × Games |
| mockup 3D de produto / packshot 3D | Transacional | Fundo | Baixa | Média | `/studios/mockup-3d-de-produto` ✅ |
| animação 3D de produto | Invest. comercial | Meio | Média | Alta | `/studios/animacao-3d` |

### Cluster C — Identidade visual e branding

| Termo | Intenção | Funil | Demanda | Concorrência | Página |
|---|---|---|---|---|---|
| identidade visual para empresas | Invest. comercial | Meio | Alta | Alta | `/studios/identidade-visual-e-branding` |
| quanto custa uma identidade visual | Transacional | Fundo | Média | Média | `/.../quanto-custa` ✅ (único com referência) |
| criação de logotipo profissional | Transacional | Fundo | Alta | **Muito alta** | Não priorizar |
| manual de marca / brand book | Invest. comercial | Meio | Baixa | Baixa | Seção dentro da página atual |

### Cluster D — Sites, sistemas e apps

| Termo | Intenção | Funil | Demanda | Concorrência | Página |
|---|---|---|---|---|---|
| quanto custa um site profissional | Transacional | Fundo | **Alta** | Alta (autoridade baixa) | `/tech/sites/quanto-custa` ⚠️ sem valores |
| criação de sites São Paulo | Transacional | Fundo | Alta | Muito alta | `/tech/sites` |
| sistema sob medida para empresa | Invest. comercial | Meio | Média | Média | `/tech/sistemas-sob-medida` ✅ |
| quanto custa um sistema sob medida | Transacional | Fundo | Média | Média | **Nova** |
| desenvolvimento de aplicativo iOS Android | Invest. comercial | Meio | Alta | Muito alta | `/tech/aplicativos` |

### Cluster E — Games e ativações

| Termo | Intenção | Funil | Demanda | Concorrência | Página |
|---|---|---|---|---|---|
| advergame para campanha | Invest. comercial | Meio | Baixa | Baixa | `/games/advergame-e-gamificacao` ✅ |
| ativação de marca em realidade virtual para eventos | Transacional | Fundo | Baixa | Média | `/games/ativacao-de-marca-em-realidade-virtual` ✅ |
| gamificação para empresas | Informacional/comercial | Topo-meio | Média | Média | Seção/artigo |
| desenvolvimento de jogos mobile | Invest. comercial | Meio | Média | Alta | `/games/jogos-mobile` |

### Cluster F — Navegacional (marca)

"Tenka Group", "TENKA Games", "grupo Tenka". **Demanda praticamente nula hoje** e
nome colidindo com entidades estabelecidas. Tratado na seção 6.

### Agrupamentos a evitar

- Não criar página separada para "logo", "logotipo" e "identidade visual" — mesma
  intenção, canibalização garantida. A fusão já feita em
  `/games/jogos-de-navegador` → `/games/advergame-e-gamificacao` foi a decisão
  certa e serve de modelo.
- Não criar páginas geográficas em massa ("maquete eletrônica em Campinas",
  "em Santos"...). Sem conteúdo diferenciado, é padrão de spam local.

---

## 5. Diagnóstico técnico e de conteúdo

### 5.1 Performance (medição em Chromium, viewport 412×915)

| Página | LCP | CLS | Requisições | Peso |
|---|---|---|---|---|
| `/` | **18.396 ms** | **0,183** | 11 | 182 KB |
| `/games` | 404 ms | 0,000 | 23 | ~3 KB (cache) |
| `/tech/sites` | 108 ms | 0,012 | 13 | ~1 KB (cache) |

**Causa do LCP da home:** o hero é um showroom que troca de slide
automaticamente. Cada slide novo com imagem grande vira um novo candidato a LCP,
e o LCP só é "congelado" na primeira interação do usuário. Sem interação, ele
continua sendo redefinido — daí os 18 s. Não é lentidão de rede (FCP de 304 ms,
DOMContentLoaded de 454 ms): é o carrossel.

**Causa do CLS da home:** 0,183 contra 0,012 numa página de serviço com o mesmo
carregamento de fontes. O shift é da própria animação do hero, não da fonte.

> Observação sobre a folha de fontes: o comentário em `index.html` documenta a
> decisão de manter o CSS do Google Fonts síncrono porque carregá-lo de forma
> assíncrona elevou o CLS de 0 para 0,141. A decisão está certa, mas a premissa
> mudou — **a home já tem CLS de 0,183 com a folha síncrona**. O caminho que o
> próprio comentário aponta (reduzir as 9 famílias, ou casar métricas de
> fallback com `size-adjust`/`ascent-override`) volta a valer.

### 5.2 Indexação, canonical e redirecionamentos

| Item | Estado |
|---|---|
| `robots.txt` | ✅ Correto, inclusive para crawlers de IA |
| `sitemap.xml` | ✅ 27 URLs, todas 200, `lastmod` atualizado |
| Canonical | ✅ Consistente e absoluto em todas as rotas |
| `tenkagroup.com.br` → `www` | ✅ 308 permanente |
| `/multimidia` → `/studios` | ✅ 308 |
| `/desenvolvimento` → `/tech` | ✅ 308 |
| `/games/jogos-de-navegador` → `/games/advergame-e-gamificacao` | ✅ 308 |
| **URL inexistente** | ⚠️ **HTTP 200** + metadados da home + `index, follow` no HTML inicial |
| **`/painel`** | ⚠️ `X-Robots-Tag: noindex` no header vs. `index, follow` no HTML |
| **`grupotenka.com.br`** | ❌ Domínio não existe |

### 5.3 Dados estruturados

Presentes e corretos: `Organization` (com `department` para as três divisões e
`sameAs` para Instagram, Facebook e LinkedIn — os três resolvem 200), `WebSite`,
`Service`, `BreadcrumbList`, `FAQPage`, `ProfessionalService` em `/contato`.

Faltando, por ordem de valor:

1. **`Offer` / `PriceSpecification`** nas quatro páginas `/quanto-custa` — só faz
   sentido depois que houver faixas publicadas.
2. **`ItemList` + `CreativeWork`** em `/projetos` — só faz sentido depois que
   houver cases.
3. **`Article`** — depende do blog existir.
4. **`Course` / `EducationalOccupationalProgram`** nas páginas de NR — avaliar
   com cuidado: a TENKA declara explicitamente que não é escola e não emite
   certificado, então `Course` pode ser impreciso. `Service` atual está correto.
5. **`VideoObject`** quando houver vídeo de simulador ou de maquete.

### 5.4 Conteúdo

| Problema | Evidência | Impacto |
|---|---|---|
| Home sem conteúdo | 71 palavras renderizadas, 0 H2, 0 H3 | Alto |
| `/projetos` sem prova | 101 palavras, 0 clientes, IPs "em produção" | **Muito alto** |
| `/sobre` sem E-E-A-T | 109 palavras, sem equipe, sem história, sem credencial | Alto |
| Divisões finas | 191–251 palavras | Médio |
| `/quanto-custa` sem números | 3 de 4 páginas sem um único "R$" | **Muito alto** |
| Bloco de isenção órfão | "Sobre os números desta página" numa página sem números | Médio |
| Zero topo de funil | Nenhum artigo, nenhum conteúdo informacional | Alto |
| `alt` ausente | 1 img na home, 2 de 5 em `/games`, 1 de 1 em `/tech/sites` | Baixo |
| Banner de cookie nas imagens do hero | Os screenshots do showroom foram capturados com o banner de consentimento por cima do headline | Médio (percepção de qualidade) |

### 5.5 Links internos — o defeito mais caro e mais barato de corrigir

Home renderizada: âncoras para `/`, `/projetos`, `/sobre`, `/contato`,
`/painel`, `/politica-de-privacidade` e **um único** link para `/games` com
âncora vazia.

- `/studios` e `/tech`: **nenhum link da home**.
- "Games", "Studios" e "Tech" no menu são `<button>`, não `<a>`.
- `/painel` (noindex) está no menu principal de todas as páginas públicas.

Páginas de divisão (`/games` confirmado; `/studios` e `/tech` usam a mesma
família de componentes — `WorldForge`, `CultureMachine`, `TechBuildEngine`):

- Âncoras presentes: `/` (×3, duas com texto vazio) e as 4 páginas de serviço.
- **Zero links para `/contato`, `/projetos`, `/sobre` ou para as outras divisões.**
- CTAs — "INICIAR PROJETO ↗", "EXPLORAR PROJETOS ↘", "INICIAR UM PROJETO ↗",
  "CONTATO" no menu — são todos `<button>` que abrem o modal de briefing.
- Os três cards de jogos têm "EXPLORAR UNIVERSO ↗" sem destino.

As páginas de serviço, por outro lado, estão bem ligadas: breadcrumb,
"Falar com a TENKA", link para a `/quanto-custa` correspondente, dois
relacionados e rodapé completo. **O padrão certo já existe no site** — basta
aplicá-lo às divisões e à home.

---

## 6. UX, copywriting e conversão

### 6.1 Os primeiros segundos (mobile)

Capturei a home em 412 px. Acima da dobra aparecem: o logo, um card com o
*screenshot de outra página do próprio site* e o banner de cookies. **Não aparece
headline, não aparece o que a empresa faz, não aparece CTA.** O H1 existe no DOM
mas não é a primeira coisa lida.

Pior: os screenshots dentro do card do showroom foram capturados **com o banner
de consentimento por cima**, cobrindo o headline do próprio mockup. O visitante
vê um banner de cookie dentro do banner de cookie.

### 6.2 Message match por origem de busca

| Origem | A busca promete | A página entrega | Match |
|---|---|---|---|
| "treinamento NR-35 realidade virtual" | Conformidade com a norma | Ficha normativa, portaria, disclaimer, processo | ✅ **Excelente** |
| "quanto custa um site profissional" | Um número | "Contar páginas não orça site" + isenção | ❌ **Falha** |
| "quanto custa maquete eletrônica" | Um número | Mesma estrutura, sem valores | ❌ **Falha** |
| "maquete eletrônica 3D" | Portfólio | 625 palavras, nenhuma imagem de projeto | ❌ **Falha** |
| "advergame para campanha" | Exemplos jogáveis | Texto bom, zero exemplo | ⚠️ Parcial |
| marca "Tenka" | Quem é a empresa | 71 palavras e um carrossel | ❌ **Falha** |

### 6.3 Redução de insegurança

O comprador B2B de um simulador de NR ou de um sistema sob medida precisa de:
quem já contratou, o que foi entregue, quem é o time, quanto tempo a empresa
existe, qual o CNPJ. **Nada disso está no site.** Há um e-mail @gmail.com, um
WhatsApp e três jogos próprios ainda não lançados.

Isso não se resolve com copy. Se resolve publicando o que existe — e, onde
houver NDA, publicando o case anonimizado ("indústria química, 340 operadores
treinados em NR-33, 4 unidades") em vez de nada.

### 6.4 Atrito até o orçamento

| Caminho | Passos | Problema |
|---|---|---|
| Divisão → modal de briefing | 5 passos obrigatórios → abre WhatsApp/mailto | Alto atrito para visitante frio; nenhuma alternativa rápida visível na página |
| `/contato` → formulário | 6 campos → monta mensagem de WhatsApp | Não captura e-mail nem telefone do lead |
| Qualquer página → WhatsApp direto | 1 clique | ✅ Disponível em `/contato` e no modal, **ausente nas divisões** |

**O defeito estrutural:** `BriefModal.submit()` chama `trackLead()` e em seguida
`window.open(whatsappUrl(...))` ou `window.location.href = mailtoUrl(...)`.
Nenhum dado vai para servidor. Consequências:

1. Se o WhatsApp não abrir (desktop sem app, popup bloqueado, cliente de e-mail
   não configurado), **o lead é perdido sem rastro** — e o GA4 registrou uma
   conversão.
2. Não existe base de leads para follow-up, nem para medir qualificação real,
   nem para fechar o ciclo "lead → reunião → venda" pedido na seção de métricas.
3. O briefing qualificado de 5 passos — que é um ativo bom — vira uma mensagem
   de texto que depende de alguém copiar para algum lugar.

Existe backend próprio (Fastify + Postgres no Railway) e o módulo de WhatsApp já
está no repositório. Gravar o briefing antes de abrir o WhatsApp é um endpoint.

### 6.5 Copy — o que já está certo

O tom é bom e é um diferencial real: "Logo bonito não é marca", "O treinamento
que ninguém lembra", "A campanha pronta e o produto ainda no molde", "Se o número
não couber, cortamos escopo junto — não qualidade em silêncio". Isso é PAS bem
executado e soa a quem entende do assunto. **Não suavizar.**

O que falta não é texto melhor. É (a) prova, (b) número e (c) um botão que leve
a algum lugar.

---

## 7. SEO local e autoridade

### 7.1 Decisões já corretas

- Negócio de área de atendimento com endereço oculto; `PostalAddress` sem
  `streetAddress` nem CEP, coerente com a ficha do Google. Correto — publicar
  logradouro de um endereço onde não se recebe cliente é causa comum de suspensão.
- `areaServed` com Brasil + São Paulo + região metropolitana.
- NAP com fonte única em `src/config/contact.ts`.

### 7.2 Lacunas

| Lacuna | Ação |
|---|---|
| Nome da marca inconsistente (tenkagroup / grupotenka / grupo.tenka) | Padronizar em um só. Sugestão: **TENKA Group**, alinhado ao domínio e ao LinkedIn |
| E-mail @gmail.com | Migrar para `contato@tenkagroup.com.br` — um dos itens de maior retorno por esforço do plano |
| `grupotenka.com.br` não existe | Decidir: registrar e redirecionar 301 para o domínio principal, ou abandonar o nome |
| Perfil da Empresa no Google | Não verificável sem acesso. Confirmar que existe, que está verificado e que o NAP bate exatamente com o site |
| Citações locais | Nenhuma encontrada. Começar por diretórios legítimos do setor e associações |
| Backlinks | Nenhum encontrado nas buscas. A marca não é citada em lugar nenhum |

### 7.3 Autoridade — o caminho legítimo

A TENKA tem uma coisa que vale link: **leitura correta e atualizada da legislação
de NR aplicada a treinamento**. Portais de SST, consultorias de segurança e
sindicatos publicam esse assunto o tempo todo e linkam para fontes.

Sequência que funciona:

1. Publicar os artigos de apoio sobre a Portaria 1.259/2026 e a Portaria
   737/2026, com a interpretação prática ("o que muda para quem treina").
2. Divulgar para os veículos que já cobrem o tema (Revista CIPA, portais de SST,
   associações de segurança do trabalho).
3. Produzir um case técnico com um cliente, com número real de operadores
   treinados.

Não comprar link, não criar rede de sites, não publicar página geográfica em
massa.

---

## 8. Páginas e conteúdos recomendados

### 8.1 Melhorar o que existe

| Página | Mudança | Palavra-chave principal | Objetivo |
|---|---|---|---|
| `/` | Virar página de verdade: H1 textual, bloco das 3 divisões com link, prova, CTA | marca + "games VR 3D sites" | Distribuir autoridade e converter |
| `/projetos` | Publicar cases reais; anonimizar onde houver NDA | "cases" + nome dos serviços | **Destravar a confiança** |
| `/sobre` | Time, história, anos de operação, CNPJ, como as divisões operam juntas | marca | E-E-A-T |
| `/tech/sites/quanto-custa` | Publicar faixas por tipo de projeto com fonte citada | quanto custa um site profissional | Capturar fundo de funil |
| `/studios/maquete-eletronica-3d/quanto-custa` | Idem, com referências de mercado | quanto custa maquete eletrônica | Idem |
| `/games/.../quanto-custa` | Idem, por formato de simulador | quanto custa treinamento em VR | Idem |
| `/studios/maquete-eletronica-3d` | Galeria de projetos entregues | maquete eletrônica 3D | Sem portfólio não converte |
| `/games`, `/studios`, `/tech` | CTAs e navegação como `<a>`; link para `/contato`, `/projetos` e entre si | termo da divisão | Corrigir o silo |

### 8.2 Páginas novas, por prioridade

| # | Página | Palavra-chave | Intenção | Estrutura | CTA | Prioridade |
|---|---|---|---|---|---|---|
| 1 | `/conteudo/nr-35-treinamento-presencial-portaria-1259` | portaria 1.259/2026 NR-35 presencial | Informacional | O que mudou → prazo de 16/07/2027 → o que fazer na prática → onde o simulador entra | Ver simulador de NR-35 | **P0** |
| 2 | `/conteudo/nova-nr-10-portaria-737-2026` | nova NR-10 2026 | Informacional | O que muda → vigência 01/06/2027 → impacto no treinamento | Ver simulador de NR-10 | **P0** |
| 3 | `/projetos/<case>` (1 por case) | nome do serviço + segmento | Invest. comercial | Problema → solução → números → o que foi entregue | Falar sobre projeto parecido | **P0** |
| 4 | `/studios/maquete-interativa-vr-stand-de-vendas` | maquete interativa VR stand de vendas | Transacional | Cruza Studios × Games — território que ninguém ocupa | Falar sobre o stand | P1 |
| 5 | `/tech/sistemas-sob-medida/quanto-custa` | quanto custa sistema sob medida | Transacional | Mesmo molde das outras `/quanto-custa`, com faixas | Pedir orçamento | P1 |
| 6 | `/conteudo/realidade-virtual-no-treinamento-de-seguranca` | treinamento de segurança com realidade virtual | Informacional | Quando VR ajuda, quando não ajuda, o que a norma permite | Ver treinamentos em VR | P1 |
| 7 | `/conteudo/quanto-custa-um-advergame` | quanto custa advergame | Transacional | Faixas por formato | Pedir orçamento | P2 |

**Critério aplicado:** nenhuma página acima existe só para "ter conteúdo". As
duas primeiras capturam demanda regulatória com prazo legal. As de case destravam
a conversão de todas as outras. A #4 ocupa um cruzamento que nenhum concorrente
oferece.

### 8.3 Interlinking do cluster de NR

```
/conteudo/portaria-1259-nr-35  ──┐
/conteudo/portaria-737-nr-10   ──┤
/conteudo/vr-treinamento-seg   ──┼──► /games/treinamento-em-realidade-virtual
                                 │         ├─► /...nr-35  ──► /projetos/<case NR-35>
                                 │         ├─► /...nr-33
                                 │         └─► /...nr-10
                                 └──────────► /...quanto-custa ──► /contato
```

---

## 9. Matriz de priorização

| # | Melhoria | Página | Impacto | Esforço | Prioridade |
|---|---|---|---|---|---|
| 1 | Transformar menu e CTAs de divisão em `<a>` reais e ligar divisões a `/contato`, `/projetos` e entre si | `/`, `/games`, `/studios`, `/tech` | **Alto** | Baixo | **P0** |
| 2 | Corrigir LCP (18,4 s) e CLS (0,183) da home: pausar/encurtar a rotação automática, fixar o candidato a LCP, reservar espaço | `/` | **Alto** | Médio | **P0** |
| 3 | ~~Gravar o briefing no backend antes de abrir WhatsApp/e-mail~~ **✅ feito em 08/10/2026** | `BriefModal`, `/contato` | **Alto** | Médio | **P0** |
| 4 | Publicar faixas de preço com fonte citada nas 4 páginas `/quanto-custa`; remover o bloco de isenção onde não houver número | 4 páginas | **Alto** | Médio | **P0** |
| 5 | Publicar cases reais (anonimizados sob NDA) com números | `/projetos` + páginas de case | **Alto** | Alto | **P0** |
| 6 | Recapturar os screenshots do hero sem o banner de cookies | `/` | Médio | **Muito baixo** | **P0** |
| 7 | Dar conteúdo à home: H1 textual, 3 divisões com link, prova, CTA | `/` | **Alto** | Médio | **P0** |
| 8 | Migrar e-mail comercial para domínio próprio e padronizar o nome da marca | Site + perfis | **Alto** | Baixo | **P0** |
| 9 | 404 real (status 404 ou `/404.html` pré-renderizado com `noindex`) | Global | Médio | Baixo | P1 |
| 10 | Remover a contradição de `robots` em `/painel` e tirar o link do menu público | `/painel` | Baixo | **Muito baixo** | P1 |
| 11 | `alt` em todas as imagens | Global | Baixo | **Muito baixo** | P1 |
| 12 | Dois artigos sobre as portarias 1.259/2026 e 737/2026 | Novas | **Alto** | Médio | P1 |
| 13 | Galeria de projetos em `/studios/maquete-eletronica-3d` | 1 página | **Alto** | Médio | P1 |
| 14 | Reescrever `/sobre` com time, história e credenciais | `/sobre` | Médio | Baixo | P1 |
| 15 | Expandir divisões de ~200 para 600+ palavras | 3 páginas | Médio | Médio | P1 |
| 16 | `Offer`/`PriceSpecification` nas `/quanto-custa` e `ItemList` em `/projetos` | 5 páginas | Médio | Baixo | P1 |
| 17 | Página de maquete interativa em VR para stand | Nova | Médio | Médio | P2 |
| 18 | Reduzir as 9 famílias de fonte / casar métricas de fallback | Global | Médio | Médio | P2 |
| 19 | Perfil da Empresa no Google verificado e citações locais | Externo | Médio | Médio | P2 |
| 20 | Divulgação dos artigos normativos para portais de SST | Externo | **Alto** | Alto | P2 |

### Por que nesta ordem

- **1, 6, 8, 10, 11** são correções de poucas horas com retorno desproporcional.
  O item 1 é o maior desequilíbrio do site: a home não passa link para duas
  divisões e as divisões não passam link para o contato.
- **2** é o único defeito de performance real, e está na página que recebe o
  tráfego de marca.
- **3, 4, 5** atacam o funil. Sem cases e sem números, melhorar ranking só traz
  visitante que não converte — o que é exatamente o que o briefing pediu para
  evitar.
- **12 e 20** constroem autoridade no único território onde a TENKA já é melhor
  que o mercado.
- **Não priorizado de propósito:** SEO para "automação com IA" (mercado saturado,
  retorno orgânico improvável), páginas geográficas em massa (violação de
  diretriz), redesign visual sem hipótese de conversão associada.

---

## 10. Plano de execução por fases

### Fase 1 — Curto prazo (semanas 1–3): destravar

1. Autorizar os conectores de Search Console e GA4 e levantar a linha de base
   real: impressões, CTR, posição média e consultas por página.
2. Itens 1, 2, 6, 8, 10 e 11 da matriz.
3. Item 3 — persistir o briefing no backend; só então o funil passa a ser
   mensurável.
4. Auditar no Search Console: cobertura, soft 404 e páginas descobertas mas não
   indexadas.

**Critério de saída:** toda página pública alcançável em ≤2 cliques da home por
link real; LCP da home < 2,5 s; CLS < 0,1; todo briefing enviado gravado no banco.

### Fase 2 — Médio prazo (semanas 4–10): entregar a promessa da busca

5. Item 5 — levantar cases com clientes, pedir autorização, publicar os
   autorizados, anonimizar o restante.
6. Item 4 — faixas de preço com fonte citada nas quatro páginas `/quanto-custa`.
7. Itens 7, 13, 14 — home, portfólio de maquete e `/sobre`.
8. Itens 15 e 16 — profundidade das divisões e schema novo.

**Critério de saída:** nenhuma página comercial sem prova visível; nenhuma página
`/quanto-custa` sem número.

### Fase 3 — Longo prazo (mês 3 em diante): autoridade

9. Item 12 — os dois artigos normativos, com atualização sempre que houver
   portaria nova.
10. Item 20 — divulgação para veículos de SST.
11. Item 17 — página de maquete interativa em VR.
12. Itens 18 e 19 — fontes e presença local.
13. Ritual mensal: ler Search Console, identificar consultas com impressão alta e
    CTR baixo e corrigir title/description dessas páginas antes de escrever
    qualquer página nova.

---

## 11. Métricas e validação

### Linha de base a estabelecer antes de qualquer mudança

Impressões e cliques orgânicos por página, CTR por consulta, posição média das
20 consultas comerciais do mapa, sessões orgânicas por página de entrada, e
`brief_open` / `brief_step` / `lead` / `contact_click` por página de origem.

### Indicadores por horizonte

| Horizonte | Indicador | Hipótese |
|---|---|---|
| Fase 1 | Páginas indexadas; cliques internos saindo da home; LCP/CLS da home; briefings gravados vs. eventos `lead` do GA4 | Links reais e persistência de lead aumentam o número de leads *registrados* mesmo sem mais tráfego |
| Fase 1 | Diferença entre `lead` (GA4) e briefings gravados | Mede a perda atual no handoff para WhatsApp — número desconhecido hoje |
| Fase 2 | CTR orgânico das 4 páginas `/quanto-custa`; taxa de rejeição dessas páginas | Publicar faixas melhora CTR e reduz pogo-sticking |
| Fase 2 | Taxa briefing iniciado → briefing concluído | Cases visíveis reduzem a desistência no meio do formulário |
| Fase 3 | Posição das consultas de NR; domínios de referência novos | Conteúdo normativo correto atrai citação de portais de SST |
| Contínuo | Leads qualificados de origem orgânica; reuniões; propostas; fechamentos | O indicador final — exige o item 3 funcionando |

### Como validar sem confundir correlação com causalidade

- Mudar **um grupo de páginas por vez** e comparar com um grupo de controle
  (ex.: publicar preço em duas das quatro `/quanto-custa` primeiro).
- Usar a **comparação de período** do Search Console com janelas de 28 dias e
  levar em conta a sazonalidade — orçamento corporativo de treinamento concentra
  em início de ano e em fim de exercício.
- Registrar a data de cada alteração relevante numa anotação. Sem isso, nenhuma
  variação é atribuível.
- Não tratar subida de posição como aumento de lead: a ponte é o CTR e a
  conversão da página, e as duas são mensuráveis separadamente.

---

## Fontes consultadas

**Legislação**
[Portaria MTE nº 1.259/2026 (gov.br)](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2026-1/portaria-mte-no-1-259-alteracao-do-anexo-iii-da-nr-35.pdf/@@download/file) ·
[Portaria MTE nº 737/2026 (gov.br)](https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/inspecao-do-trabalho/seguranca-e-saude-no-trabalho/sst-portarias/2026-1/portaria-mte-no-737-nova-nr-10.pdf) ·
[RS Data](https://www.rsdata.com.br/portaria-mte-1259-2026-nr35-treinamento-presencial-escadas/) ·
[SOC](https://www.soc.com.br/blog-de-sst/nr-35-muda-regras-para-treinamentos-em-trabalho-em-altura-entenda-o-que-muda-com-a-portaria-mte-no-1-259-2026/) ·
[Revista CIPA e Incêndio](https://revistacipaeincendio.com.br/portaria-mte-no-1-259-2026-e-a-evolucao-da-responsabilidade-tecnica-no-trabalho-em-altura/) ·
[Normas Legais](https://www.normaslegais.com.br/legislacao/portaria-mte-737-2026.htm) ·
[A3A Engenharia](https://a3aengenharia.com.br/conteudo/noticias/nova-nr-10-2026-portaria-mte-737/)

**Concorrentes — VR e ativações**
[Casa Mais](https://www.agenciacasamais.com.br/) ·
[Casa Mais — jogos em VR](https://www.agenciacasamais.com.br/jogos-em-realidade-virtual-para-empresas/) ·
[Casa Mais — treinamento NR](https://www.agenciacasamais.com.br/treinamento-realidade-virtual-seguranca-do-trabalho-empresas/) ·
[4VR](https://4vr.com.br/) ·
[Lou Studios](https://www.loustudios.com.br/post/advergames-de-lan%C3%A7amento-como-o-desenvolvimento-de-advergame-3d-transforma-campanhas-no-navegador) ·
[Agência Primeira Página](https://agenciaprimeirapagina.com.br/realidade-aumentada) ·
[Inbraep](https://inbraep.com.br/curso-nr35/) ·
[WFaccioli](https://wfaccioli.com.br/treinamentos-normativos-com-realidade-virtual-mais-seguranca-e-eficiencia-na-capacitacao/) ·
[Oniria](https://oniria.com.br/como-planejar-treinamentos-com-realidade-virtual/)

**Concorrentes — 3D e maquete**
[Pixel Blend — preço](https://www.pixelblend.com.br/preco-maquete-eletronica/) ·
[Pixel Blend](https://www.pixelblend.com.br/) ·
[Render Fabrik](https://renderfabrik.com/empresa-renderizacao-3d-sao-paulo/) ·
[3D Pictures](https://www.3dpictures.com.br/maquete-eletronica-sp.html) ·
[SET 3D](https://set3dstudio.com/projetos/) ·
[Comunica 3D](https://comunica3d.com.br/) ·
[Vizyro](https://vizyron.com.br/blog/maquete-eletronica-3d-preco-quando-vale/) ·
[Skyline](https://www.skylineip.com.br/blog/preco-de-maquete-3d) ·
[iTeleport](https://iteleport.com.br/guia-de-precificacao-de-renderizacao-3d/)

**Concorrentes — sites e sistemas**
[Levolu](https://levolu.com.br/blog/quanto-custa-criar-site-profissional-2026) ·
[Agência DBox](https://agenciadbox.com.br/blog/quanto-custa-criar-site/) ·
[Safira Design](https://safiradesign.com.br/blog/quanto-custa-um-site-profissional/) ·
[Upsites](https://upsites.digital/desenvolvimento-web/quanto-custa-site-profissional/) ·
[Agência Macan](https://www.agenciamacan.com.br/blog/quanto-custa-um-site) ·
[Nimbus Digital](https://nimbusdigital.com.br/blog/quanto-custa-um-site-profissional-veja-valores-reais-e-o-que-esta-incluso/)

**Concorrentes — automação e IA**
[Price Tecnologia](https://pricetecnologia.com.br/solucoes/agentes-de-ia) ·
[Level Group](https://levelgroup.com.br/level-digital/desenvolvimento-agentes-ia/) ·
[Venturus](https://www.venturus.org.br/insights/blog/agentes-de-ia-para-empresas-o-salto-para-processos-de-alta-performance) ·
[NexAi](https://www.nexai.com.br/automacao-de-processos-com-ia/) ·
[Intelecta](https://intelecta.digital/automacao-inteligente-com-ia-para-pequenas-empresas/)
