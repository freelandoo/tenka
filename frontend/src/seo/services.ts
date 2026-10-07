import type { SeoRoute } from './routes';

/**
 * Páginas de serviço — uma URL por intenção comercial.
 *
 * Antes disso cada divisão era um one-pager: "treinamento em VR" e "maquete
 * eletrônica 3D" eram um `<h3>` dentro de `/games` e `/studios`. Nenhum `<h3>`
 * ranqueia para a busca que origina o lead, e não há como linkar, medir ou
 * anunciar um pedaço de página.
 *
 * O recorte saiu das SERPs reais de cada termo: as frentes com concorrência
 * fraca e intenção comercial alta (treinamento em VR, ativação em VR, advergame,
 * automação com IA) vêm primeiro; as saturadas (sites, criação de marca) entram
 * por long tail e sem depender de ranquear no termo genérico.
 */

export interface ServiceSection {
  title: string;
  body: string;
}

export interface ServiceContent {
  /** Casa com o `path` da SeoRoute correspondente. */
  path: string;
  parent: '/games' | '/studios' | '/tech';
  parentLabel: string;
  accent: string;
  /** O problema do cliente, antes de falar de entregável. */
  problem: { title: string; body: string };
  /** O que está incluído — cada item vira um `<h3>`. */
  includes: { title: string; description: string }[];
  /** Etapas, no vocabulário desta frente. */
  process: { step: string; title: string; description: string }[];
  /** Blocos de texto corrido para profundidade e semântica. */
  sections?: ServiceSection[];
  /** Links internos contextuais — path + rótulo. */
  related: { to: string; label: string }[];
  ctaLabel: string;
}

// ---------------------------------------------------------------------------
// TENKA GAMES
// ---------------------------------------------------------------------------

const GAMES_ACCENT = '#FF6A0A';

export const SERVICE_ROUTES: SeoRoute[] = [
  {
    path: '/games/treinamento-em-realidade-virtual',
    title: 'Treinamento em realidade virtual para empresas | TENKA',
    description:
      'Desenvolvemos treinamentos em realidade virtual sob medida: simulação de risco, cenários de NR, avaliação por desempenho e analytics de turma. São Paulo.',
    h1: 'Treinamento em realidade virtual para empresas',
    intro:
      'Simulações em VR para capacitar equipes em processos, ambientes e situações que são caras, arriscadas ou impossíveis de reproduzir na prática. O colaborador erra no cenário virtual, repete quantas vezes precisar e sai com desempenho medido.',
    highlights: [
      'Treinamento de segurança do trabalho — cenários de risco controlado para normas regulamentadoras',
      'Treinamento operacional — procedimentos, maquinário e rotina de chão de fábrica',
      'Treinamento de atendimento e comportamento — situações críticas com pessoas',
      'Avaliação e analytics — desempenho por colaborador, por etapa e por turma',
      'Suporte a Meta Quest e PC VR, com operação assistida ou autônoma',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Qual a diferença entre um treinamento em VR e um vídeo 360?',
        answer:
          'Vídeo 360 é assistido: o colaborador olha ao redor, mas não age. Um treinamento em VR é jogável — ele executa o procedimento, erra, sofre a consequência no cenário e repete. É essa decisão sob pressão que fixa o aprendizado e que pode ser medida.',
      },
      {
        question: 'Dá para treinar normas regulamentadoras em realidade virtual?',
        answer:
          'Sim, como complemento prático. Construímos cenários para situações como trabalho em altura, espaço confinado, risco elétrico e segurança de máquinas, reproduzindo o ambiente real da empresa. A validade formal do treinamento continua dependendo do profissional habilitado e da carga horária que a norma exige — a VR entra na parte prática, não substitui a responsabilidade técnica.',
      },
      {
        question: 'Precisamos comprar os óculos?',
        answer:
          'Não necessariamente. O projeto pode ser entregue para o parque de equipamentos que a empresa já tem, ou operado por nós em formato de turma, com equipamento e operador no local. Se fizer sentido comprar, orientamos a escolha pelo cenário, não pela ficha técnica.',
      },
      {
        question: 'Como medimos o resultado?',
        answer:
          'Cada cenário tem pontos de decisão instrumentados: o que o colaborador fez, em que ordem, quanto tempo levou e onde errou. Isso vira um painel por colaborador e por turma, que o RH ou o SESMT usa para decidir quem precisa repetir e qual etapa do procedimento está falhando no time inteiro.',
      },
    ],
    priority: 0.9,
    changefreq: 'monthly',
  },
  {
    path: '/games/ativacao-de-marca-em-realidade-virtual',
    title: 'Ativação de marca em realidade virtual para eventos | TENKA',
    description:
      'Experiências em VR para eventos, feiras, stands e lançamentos: conceito, produção, equipamento e operação no local. Atendimento em São Paulo e todo o Brasil.',
    h1: 'Ativação de marca em realidade virtual para eventos e feiras',
    intro:
      'Uma experiência imersiva que faz o visitante parar, entrar na fila e sair contando. Cuidamos do conceito à operação: o que a pessoa vive dentro do headset, quanto tempo dura, quantas rodadas por hora o stand aguenta e quem opera no dia.',
    highlights: [
      'Conceito e roteiro da experiência, alinhados à mensagem da campanha',
      'Produção do mundo em VR — modelagem, interação e identidade da marca',
      'Operação no local — equipamento, higienização, fila e staff treinado',
      'Captura de lead e conteúdo — integração com CRM e material para redes',
      'Formatos para stand de feira, lançamento, convenção e espaço próprio',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Quanto tempo dura uma experiência de ativação em VR?',
        answer:
          'Em feira, o ponto de equilíbrio costuma ficar entre 90 segundos e 3 minutos. Mais curto não constrói memória; mais longo trava a fila e reduz quantas pessoas a marca consegue impactar por hora. Dimensionamos a duração pelo fluxo esperado do evento, não pelo roteiro ideal.',
      },
      {
        question: 'Vocês levam os óculos e operam no dia?',
        answer:
          'Sim. A ativação pode ser entregue chave na mão, com equipamento, higienização entre usos, staff treinado e um supervisor responsável pela operação durante todo o evento.',
      },
      {
        question: 'A ativação gera lead?',
        answer:
          'Pode gerar. O cadastro acontece na entrada da fila ou no fim da experiência, e a captura pode ser integrada ao CRM ou entregue em planilha. Também produzimos o registro da pessoa dentro da experiência, que costuma ser o conteúdo que ela mesma publica.',
      },
      {
        question: 'Atendem fora de São Paulo?',
        answer:
          'Sim. A produção é feita em São Paulo e a operação viaja — já considerando logística de equipamento, montagem e equipe no orçamento da praça.',
      },
    ],
    priority: 0.9,
    changefreq: 'monthly',
  },
  {
    path: '/games/advergame-e-gamificacao',
    title: 'Advergame e gamificação para marcas e empresas | TENKA',
    description:
      'Criamos advergames e sistemas de gamificação sob medida: jogo de campanha acessível por link, mecânica de engajamento, premiação e métricas de participação.',
    h1: 'Advergame e gamificação para marcas e empresas',
    intro:
      'Um jogo que carrega a mensagem da marca e que as pessoas jogam por vontade própria. Advergame para campanha e promoção, gamificação para engajamento contínuo — de fidelidade de cliente a adoção interna de processo.',
    highlights: [
      'Advergame de campanha — jogo de navegador, acessível por link, sem instalação',
      'Mecânica de promoção — ranking, sorteio, cupom e regras auditáveis',
      'Gamificação de produto — pontos, missões, progresso e recompensa dentro do seu sistema',
      'Gamificação interna — adoção de processo, treinamento e metas de equipe',
      'Métricas — partidas, tempo de sessão, retorno e conversão para o objetivo da campanha',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'O que é um advergame?',
        answer:
          'É um jogo criado para comunicar uma marca ou campanha. Em vez de interromper o conteúdo que a pessoa consome, ele é o conteúdo: ela escolhe jogar, passa minutos com a marca e costuma voltar. Funciona bem quando a mecânica tem relação com o produto, e não quando é um joguinho genérico com um logo colado.',
      },
      {
        question: 'O jogador precisa instalar alguma coisa?',
        answer:
          'Não. Advergames de campanha são entregues em WebGL e abrem no navegador do celular ou do desktop a partir de um link ou QR code — é o que mantém o atrito baixo o suficiente para a campanha funcionar.',
      },
      {
        question: 'Qual a diferença entre advergame e gamificação?',
        answer:
          'Advergame é um jogo completo a serviço de uma campanha, com início, meio e fim. Gamificação é aplicar lógica de jogo — progresso, missão, recompensa — a algo que não é jogo: um app, um programa de fidelidade, um treinamento. Um é peça de comunicação; o outro é camada de produto.',
      },
      {
        question: 'Dá para integrar com promoção e sorteio?',
        answer:
          'Sim. Construímos a mecânica de participação, o registro auditável de cada partida e a integração com a plataforma da promoção. A conformidade da promoção comercial com a legislação é conduzida pela empresa e sua assessoria; entregamos o que o regulamento exigir em termos de registro e relatório.',
      },
    ],
    priority: 0.85,
    changefreq: 'monthly',
  },

  // -------------------------------------------------------------------------
  // TENKA STUDIOS
  // -------------------------------------------------------------------------
  {
    path: '/studios/maquete-eletronica-3d',
    title: 'Maquete eletrônica 3D para lançamentos | TENKA Studios',
    description:
      'Maquete eletrônica 3D para incorporadoras e construtoras: fachada, implantação, áreas comuns e plantas humanizadas com acabamento de campanha. São Paulo.',
    h1: 'Maquete eletrônica 3D para lançamentos imobiliários',
    intro:
      'Imagens que vendem o empreendimento antes da obra existir. Fachada, implantação, áreas comuns, decorados e plantas humanizadas, com o nível de acabamento que a peça de campanha exige — não o render técnico que só o engenheiro entende.',
    highlights: [
      'Fachada e implantação — a imagem-âncora do lançamento, em diurna e noturna',
      'Áreas comuns e decorados — lazer, hall, fachada ativa e unidades tipo',
      'Plantas humanizadas — leitura imediata do produto para o material de venda',
      'Tour e animação — percurso pelo empreendimento quando a peça estática não basta',
      'Variações de campanha — formatos para stand, anúncio, portal e redes',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'Em que fase do projeto a maquete eletrônica deve entrar?',
        answer:
          'Assim que a volumetria e a implantação estiverem definidas e antes do fechamento do material de venda. Entrar cedo demais significa refazer a cada revisão de projeto; entrar tarde demais atrasa o stand e a campanha, que dependem da imagem como peça-âncora.',
      },
      {
        question: 'O que vocês precisam receber para começar?',
        answer:
          'Projeto arquitetônico (plantas, cortes e fachadas), implantação, memorial de acabamentos e qualquer referência de linguagem que o cliente já tenha. Quanto mais definido o acabamento, menos ida e volta na etapa de materiais.',
      },
      {
        question: 'Quantas revisões estão incluídas?',
        answer:
          'Trabalhamos com rodadas de aprovação marcadas: uma na etapa de enquadramento e volumetria em cinza, outra em materiais e luz, e um ajuste fino na finalização. Mudança de projeto depois do aceite da volumetria é tratada à parte, porque refaz a cena.',
      },
      {
        question: 'Fazem também a animação e o tour virtual?',
        answer:
          'Sim. A cena construída para as imagens é a mesma que alimenta a animação e o tour, então sai mais barato produzir os dois juntos do que contratar a animação depois, com outro fornecedor, a partir do zero.',
      },
    ],
    priority: 0.85,
    changefreq: 'monthly',
  },
  {
    path: '/studios/mockup-3d-de-produto',
    title: 'Mockup e render 3D de produto para campanha | TENKA Studios',
    description:
      'Mockup digital e render 3D de produto com acabamento publicitário: packshot, variações de cor e rótulo, e imagens de campanha sem depender de protótipo físico.',
    h1: 'Mockup e render 3D de produto para campanha',
    intro:
      'Imagens comerciais do seu produto antes de existir uma unidade física — ou depois, sem travar a campanha em agenda de estúdio. Um modelo 3D bem construído gera packshot, variação de cor, troca de rótulo e nova campanha pelo resto da vida do produto.',
    highlights: [
      'Packshot publicitário — produto isolado, pronto para e-commerce e anúncio',
      'Variações — cor, sabor, volume e rótulo a partir do mesmo modelo',
      'Cena de campanha — produto em contexto, com direção de arte e luz',
      'Validação de embalagem — ver o rótulo aplicado antes de mandar imprimir',
      'Animação de produto — quando a peça precisa de movimento',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'Mockup 3D ou fotografia de estúdio?',
        answer:
          'Fotografia ganha quando o produto já existe, é único e a textura real é o argumento. O 3D ganha quando o produto ainda não existe, quando há muitas variações de cor ou rótulo, ou quando a campanha vai precisar de novas imagens depois — porque aí cada nova peça custa uma renderização, não uma nova diária de estúdio.',
      },
      {
        question: 'O que vocês precisam para modelar o produto?',
        answer:
          'Desenho técnico com dimensões, o arquivo do rótulo ou embalagem em vetor, e referências do acabamento (fosco, brilhante, metalizado, translúcido). Na falta do desenho técnico, fotos com uma referência de escala resolvem, com um ajuste a mais na aprovação.',
      },
      {
        question: 'As imagens servem para e-commerce e marketplace?',
        answer:
          'Sim, e é um dos usos mais comuns. Entregamos nos enquadramentos e proporções que cada canal exige, a partir da mesma cena, incluindo fundo branco quando o marketplace obriga.',
      },
      {
        question: 'Dá para usar o mesmo modelo depois, em outra campanha?',
        answer:
          'Essa é a vantagem principal. O modelo fica disponível para novas cenas, novos ângulos e novas variações, o que faz a segunda campanha custar uma fração da primeira.',
      },
    ],
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/studios/identidade-visual-e-branding',
    title: 'Identidade visual e branding para empresas | TENKA Studios',
    description:
      'Criação de identidade visual, branding e logotipo: posicionamento, símbolo, paleta, tipografia, grafismos e manual de aplicação para a marca funcionar na prática.',
    h1: 'Identidade visual, branding e criação de logotipo',
    intro:
      'Uma marca que funciona do favicon ao letreiro. Posicionamento e personalidade primeiro, para que símbolo, cor e tipografia sejam decisão e não gosto — e um manual que faz a identidade sobreviver a quem for aplicá-la depois.',
    highlights: [
      'Posicionamento e território — o lugar que a marca ocupa e o tom que ela usa',
      'Símbolo e logotipo — desenhados para funcionar em qualquer escala',
      'Sistema visual — paleta, tipografia, grafismos e regras de composição',
      'Aplicações — papelaria, digital, social, sinalização e material de campanha',
      'Manual de marca — para o time e os fornecedores aplicarem sem supervisão',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'Qual a diferença entre logotipo, identidade visual e branding?',
        answer:
          'Logotipo é a assinatura: o desenho do nome e do símbolo. Identidade visual é o sistema inteiro ao redor dele — paleta, tipografia, grafismos e regras de aplicação. Branding é anterior aos dois: posicionamento, personalidade e discurso, que definem por que a identidade é daquele jeito. Contratar só o logo costuma ser a origem do retrabalho seis meses depois.',
      },
      {
        question: 'Quanto custa uma identidade visual?',
        answer:
          'Varia muito com o escopo: uma marca com símbolo, paleta e manual básico é um projeto; uma marca com arquitetura de submarcas, sinalização e campanha de lançamento é outro. Orçamos depois de entender onde a marca precisa aparecer — pedir preço antes disso leva a comparar propostas que entregam coisas diferentes.',
      },
      {
        question: 'Vocês registram a marca no INPI?',
        answer:
          'O registro é conduzido por um escritório especializado, não por nós. O que fazemos é desenhar considerando a viabilidade de registro e entregar os arquivos no formato que o processo exige.',
      },
      {
        question: 'Posso contratar a identidade junto com o site?',
        answer:
          'Sim, e costuma sair melhor. A identidade nasce já testada na aplicação que mais importa, e a TENKA Tech constrói o site a partir do mesmo sistema, sem a tradução perdida entre dois fornecedores.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },

  // -------------------------------------------------------------------------
  // TENKA TECH
  // -------------------------------------------------------------------------
  {
    path: '/tech/automacoes-e-agentes-de-ia',
    title: 'Automação de processos e agentes de IA para empresas | TENKA',
    description:
      'Automação de processos com IA: integração entre sistemas, agentes que consultam dados e agem, atendimento no WhatsApp e rotinas que eliminam trabalho manual.',
    h1: 'Automação de processos e agentes de IA para empresas',
    intro:
      'O trabalho que a sua equipe faz copiando dado de um sistema para outro não precisa existir. Mapeamos o processo, conectamos as ferramentas que você já usa e colocamos agentes de IA onde há decisão — não onde há só hype.',
    highlights: [
      'Integração entre sistemas — ERP, CRM, planilhas, e-mail e ferramentas internas',
      'Agentes de IA — consultam dados reais, decidem com contexto e executam ações',
      'Atendimento automatizado — triagem e qualificação no WhatsApp e no site',
      'Rotinas e webhooks — disparos por evento, filas e tratamento de erro',
      'Observabilidade — log do que o agente fez, por quê, e onde falhou',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Qual a diferença entre um chatbot e um agente de IA?',
        answer:
          'Um chatbot responde a partir de um roteiro ou de um texto que leu. Um agente consulta seus sistemas em tempo real, decide com base no que encontrou e executa ações — cria o pedido, agenda a visita, atualiza o cadastro. A diferença prática é se o atendimento termina em "vou verificar e te retorno" ou em algo resolvido.',
      },
      {
        question: 'Vocês trabalham com n8n, Make ou código próprio?',
        answer:
          'Com os três, e a escolha é consequência do processo. Ferramenta visual é ótima para integrar sistemas de prateleira e permite que seu time ajuste o fluxo depois. Código próprio compensa quando há volume alto, lógica complexa ou requisito de latência. O erro comum é decidir a ferramenta antes de mapear o processo.',
      },
      {
        question: 'E se a automação errar?',
        answer:
          'Automação sem tratamento de erro é dívida, não ganho. Todo fluxo que entregamos tem log do que aconteceu, política de repetição e um caminho de escalonamento para humano nos pontos em que o custo do erro é alto. Em processo financeiro ou com cliente, o padrão é o agente propor e uma pessoa confirmar.',
      },
      {
        question: 'Meus dados vão para um modelo de IA de terceiro?',
        answer:
          'Depende da arquitetura, e é uma decisão explícita do projeto, não um detalhe escondido. Definimos junto o que pode sair da sua infraestrutura, o que é anonimizado antes de sair e o que roda em modelo auto-hospedado. Isso entra no desenho antes da primeira linha de código.',
      },
    ],
    priority: 0.85,
    changefreq: 'monthly',
  },
  {
    path: '/tech/sistemas-sob-medida',
    title: 'Sistema sob medida e plataformas SaaS | TENKA Tech',
    description:
      'Desenvolvimento de sistema sob medida e plataformas SaaS: cadastros, permissões, cobrança recorrente, dashboards e integrações feitos para a sua operação.',
    h1: 'Sistema sob medida e plataformas SaaS',
    intro:
      'Quando a planilha vira gargalo e o sistema de prateleira não cabe no seu processo, o software passa a ser o processo. Construímos a plataforma em torno de como a sua operação realmente funciona — com permissões, dados e integrações desenhados para durar.',
    highlights: [
      'Cadastros e operação — o fluxo real da empresa, não o do manual do fornecedor',
      'Autenticação e permissões — cada papel vê e faz exatamente o que deve',
      'Cobrança e assinaturas — recorrência, parcelamento e conciliação',
      'Dashboards e relatórios — os números que decidem o dia, não vinte gráficos',
      'Integrações — com o que a empresa já usa, por API e webhook',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Quando vale fazer sob medida em vez de contratar um sistema pronto?',
        answer:
          'Quando o processo é a vantagem competitiva, quando o sistema pronto obriga a mudar o jeito de trabalhar por um motivo que não melhora nada, ou quando a soma das assinaturas e das gambiarras de integração já passou do custo de ter o seu. Se o de prateleira resolve, a resposta honesta é usar o de prateleira.',
      },
      {
        question: 'De quem é o código?',
        answer:
          'Do cliente. O repositório, a infraestrutura e os dados ficam em contas do cliente, e a documentação de operação faz parte da entrega. Contratar desenvolvimento não deveria criar dependência de fornecedor — e, quando cria, foi de propósito.',
      },
      {
        question: 'Como funciona o prazo de um sistema?',
        answer:
          'Em entregas parciais. Definimos a fatia que já resolve alguma dor sozinha e colocamos em uso cedo, para o resto do escopo ser decidido com o sistema rodando. Projeto que só aparece no fim é o que costuma chegar errado.',
      },
      {
        question: 'Vocês cuidam da manutenção depois?',
        answer:
          'Sim, em acompanhamento mensal: monitoramento, correções, evolução e suporte ao time. Também é possível receber o projeto documentado e seguir com equipe própria — a escolha é do cliente, não uma condição do contrato.',
      },
    ],
    priority: 0.8,
    changefreq: 'monthly',
  },
  {
    path: '/tech/sites',
    title: 'Criação de sites rápidos e que convertem | TENKA Tech',
    description:
      'Criação de sites institucionais, landing pages e portais com performance, SEO técnico e CMS para o time editar — construídos para converter, não só para existir.',
    h1: 'Criação de sites institucionais e landing pages',
    intro:
      'Um site que carrega rápido, aparece na busca e conduz o visitante até o contato. Sem construtor pesado, sem página bonita que demora cinco segundos no 4G e sem depender de agência para trocar um parágrafo.',
    highlights: [
      'Sites institucionais — estrutura de páginas pensada para busca e para conversão',
      'Landing pages — uma intenção por página, com medição ponta a ponta',
      'Performance — Core Web Vitals tratados no projeto, não auditados no fim',
      'SEO técnico — metadados por página, dados estruturados, sitemap e canonical',
      'CMS — o time edita texto e imagem sem pedir deploy',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Quanto custa um site profissional?',
        answer:
          'Depende de quantas páginas de intenção o site precisa ter, se há CMS, integrações e produção de conteúdo. Uma landing page única e um site institucional com dez páginas, blog e área de materiais são projetos de ordens diferentes. Orçamos depois de entender o que o site precisa fazer acontecer — número de páginas sozinho não diz muita coisa.',
      },
      {
        question: 'O site já vem otimizado para o Google?',
        answer:
          'Vem com a parte técnica resolvida: título e descrição por página, dados estruturados, canonical, sitemap, imagens dimensionadas e HTML que o crawler lê sem depender de executar JavaScript. Isso é a fundação. Ranquear para um termo disputado também depende de conteúdo e autoridade ao longo do tempo, e isso é trabalho contínuo, não entrega de projeto.',
      },
      {
        question: 'Posso editar o site depois sem programador?',
        answer:
          'Sim. Entregamos com CMS para os conteúdos que mudam — textos, imagens, posts, equipe, cases. Mudanças de estrutura e de layout continuam sendo trabalho de projeto, e isso é proposital: é o que impede o site de se degradar com o tempo.',
      },
      {
        question: 'Vocês fazem e-commerce?',
        answer:
          'Fazemos quando a loja tem uma necessidade que as plataformas prontas não atendem. Se o caso cabe numa plataforma de e-commerce consolidada, dizemos isso — sai mais barato e você ganha um ecossistema inteiro de integrações que não precisamos reconstruir.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
];

// ---------------------------------------------------------------------------
// Conteúdo das páginas
// ---------------------------------------------------------------------------

const STUDIOS_ACCENT = '#D9232E';
const TECH_ACCENT = '#00B8B3';

export const SERVICE_CONTENT: ServiceContent[] = [
  {
    path: '/games/treinamento-em-realidade-virtual',
    parent: '/games',
    parentLabel: 'TENKA Games',
    accent: GAMES_ACCENT,
    problem: {
      title: 'O treinamento que ninguém lembra',
      body: 'Slide, vídeo e palestra ensinam o colaborador a reconhecer a resposta certa na prova — não a tomar a decisão certa no momento em que o procedimento sai do script. A parte prática, que seria o que realmente fixa, costuma esbarrar em custo, risco ou na impossibilidade de parar a operação. O resultado é um treinamento que cumpre a exigência formal e não muda o comportamento no chão de fábrica.',
    },
    includes: [
      {
        title: 'Cenário fiel ao seu ambiente',
        description:
          'Reconstruímos o local, o equipamento e o procedimento da sua empresa. Treinar num galpão genérico ensina o conceito; treinar no seu galpão ensina o trabalho.',
      },
      {
        title: 'Erro com consequência, sem consequência real',
        description:
          'O colaborador executa, erra e vê o que o erro causa. É a única forma barata de ensinar o que acontece quando o procedimento é pulado.',
      },
      {
        title: 'Repetição ilimitada',
        description:
          'Sem custo marginal por repetição, sem agendar parada de linha e sem expor ninguém. Quem precisa de dez tentativas faz dez.',
      },
      {
        title: 'Avaliação instrumentada',
        description:
          'Cada ponto de decisão é registrado: o que foi feito, em que ordem, em quanto tempo. Vira nota por colaborador e diagnóstico por turma.',
      },
      {
        title: 'Operação definida',
        description:
          'Entregamos também como o treinamento roda: quantos headsets, quantas pessoas por hora, quem opera, como higieniza e como os dados chegam ao RH.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Imersão',
        description:
          'Visitamos a operação, entendemos o procedimento, os riscos reais e o que hoje falha no treinamento atual.',
      },
      {
        step: '02',
        title: 'Protótipo do cenário',
        description:
          'Um trecho jogável antes de produzir tudo, testado com quem vai usar. É aqui que se descobre se a mecânica ensina mesmo.',
      },
      {
        step: '03',
        title: 'Produção',
        description:
          'Ambiente, interação, áudio e avaliação construídos como um sistema só, com performance calibrada para o headset escolhido.',
      },
      {
        step: '04',
        title: 'Turma-piloto e ajuste',
        description:
          'Rodamos com uma turma real, medimos onde as pessoas travam e corrigimos antes de escalar para a empresa inteira.',
      },
    ],
    sections: [
      {
        title: 'Treinamento de segurança e normas regulamentadoras',
        body: 'Trabalho em altura, espaço confinado, risco elétrico, bloqueio e etiquetagem, segurança de máquinas: são os cenários em que a prática real é cara ou perigosa, e por isso os que mais ganham com simulação. Construímos o ambiente da sua empresa com os riscos que ele de fato tem, e a avaliação acompanha o procedimento que o seu SESMT definiu. Importante ser claro: a VR entra na parte prática e no reforço, e a validade formal do treinamento continua dependendo do profissional habilitado, da carga horária e dos requisitos que cada norma estabelece.',
      },
      {
        title: 'Treinamento operacional e de atendimento',
        body: 'Fora da segurança, a mesma lógica vale para qualquer procedimento com sequência e consequência: montagem e setup de máquina, rotina de abertura de loja, protocolo de atendimento, situação crítica com cliente, onboarding de função. Quando a tarefa envolve ordem de passos e decisão sob pressão, a simulação ensina mais rápido do que o manual — e mede o que o manual não mede.',
      },
    ],
    related: [
      { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca em VR' },
      { to: '/games', label: 'TENKA Games' },
      { to: '/tech/sistemas-sob-medida', label: 'Painel de acompanhamento sob medida' },
    ],
    ctaLabel: 'Falar sobre um treinamento em VR',
  },
  {
    path: '/games/ativacao-de-marca-em-realidade-virtual',
    parent: '/games',
    parentLabel: 'TENKA Games',
    accent: GAMES_ACCENT,
    problem: {
      title: 'O stand que ninguém lembra na segunda-feira',
      body: 'Em feira, a marca disputa atenção com dezenas de stands que oferecem a mesma coisa: um balcão, um folheto e alguém tentando puxar conversa. O visitante passa, pega o brinde e esquece. Uma experiência que exige o corpo da pessoa — e não só o olhar — muda o cálculo: ela entra na fila por vontade própria, passa minutos dentro da marca e sai com história para contar.',
    },
    includes: [
      {
        title: 'Conceito ligado à mensagem',
        description:
          'A experiência precisa dizer algo sobre a marca. VR genérico diverte e não comunica — e no mês seguinte ninguém associa aquilo a você.',
      },
      {
        title: 'Duração dimensionada pela fila',
        description:
          'Calculamos quantas pessoas por hora o stand precisa atender e desenhamos a experiência para esse número, não para o roteiro ideal.',
      },
      {
        title: 'Produção do mundo',
        description:
          'Modelagem, interação, áudio e identidade visual da marca aplicada dentro da experiência.',
      },
      {
        title: 'Operação no local',
        description:
          'Equipamento, montagem, higienização entre usos, staff treinado e supervisor responsável durante todo o evento.',
      },
      {
        title: 'Lead e conteúdo',
        description:
          'Captura integrada ao CRM e registro da pessoa na experiência — o material que ela mesma publica depois.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Briefing do evento',
        description:
          'Público, fluxo esperado, metragem do stand, energia disponível e o que a marca precisa comunicar.',
      },
      {
        step: '02',
        title: 'Conceito e roteiro',
        description:
          'O que a pessoa vive, por quanto tempo, e qual é a frase que ela repete depois de tirar o headset.',
      },
      {
        step: '03',
        title: 'Produção e teste de carga',
        description:
          'Construção da experiência e ensaio da operação com o tempo real de ciclo, incluindo troca de usuário.',
      },
      {
        step: '04',
        title: 'Operação e relatório',
        description:
          'Montagem, dias de evento com equipe dedicada e um fechamento com números de participação e leads.',
      },
    ],
    sections: [
      {
        title: 'Formatos que funcionam',
        body: 'Stand de feira pede ciclo curto e alto giro. Convenção interna aceita experiência mais longa e narrativa, porque o público é cativo. Lançamento de produto costuma pedir uma experiência que mostre o que não cabe no estande físico — a fábrica, o interior do produto, a escala real. Espaço proprietário, como showroom ou loja-conceito, justifica uma instalação permanente, com manutenção e atualização de conteúdo. O formato sai do evento, não do catálogo.',
      },
    ],
    related: [
      { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' },
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
      { to: '/studios', label: 'Produção 3D da TENKA Studios' },
    ],
    ctaLabel: 'Falar sobre uma ativação em VR',
  },
  {
    path: '/games/advergame-e-gamificacao',
    parent: '/games',
    parentLabel: 'TENKA Games',
    accent: GAMES_ACCENT,
    problem: {
      title: 'Atenção não se compra mais só com mídia',
      body: 'O custo de interromper alguém sobe todo ano, e a tolerância do público cai junto. Um jogo inverte a relação: a pessoa escolhe entrar, fica minutos em vez de segundos e volta por conta própria. O mesmo vale para dentro de casa — um programa de fidelidade ou um processo interno que ninguém usa não tem problema de comunicação, tem problema de mecânica.',
    },
    includes: [
      {
        title: 'Mecânica ligada ao produto',
        description:
          'O jogo precisa ter a ver com o que a marca vende. Jogo genérico com logo colado entretém e não comunica nada.',
      },
      {
        title: 'Acesso por link, sem instalação',
        description:
          'WebGL no navegador do celular ou do desktop, por link ou QR code. Cada passo a mais derruba a participação pela metade.',
      },
      {
        title: 'Regras de promoção',
        description:
          'Ranking, sorteio, cupom e registro auditável de cada partida, integrados à plataforma da promoção.',
      },
      {
        title: 'Camada de gamificação',
        description:
          'Pontos, missões, progresso e recompensa aplicados dentro do seu produto, programa de fidelidade ou processo interno.',
      },
      {
        title: 'Medição do que importa',
        description:
          'Partidas, tempo de sessão, retorno e conversão para o objetivo real da campanha — não só número de acessos.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Objetivo',
        description:
          'O que precisa acontecer: lembrança de marca, cadastro, resgate de cupom, adoção de um processo, retenção.',
      },
      {
        step: '02',
        title: 'Mecânica',
        description:
          'Desenhamos e testamos a mecânica central em protótipo cru, antes de qualquer arte. Se não é divertido em cinza, não será com arte.',
      },
      {
        step: '03',
        title: 'Produção',
        description:
          'Arte, código, áudio e integrações — com peso de página tratado como requisito, porque campanha roda em 4G.',
      },
      {
        step: '04',
        title: 'Campanha e leitura',
        description:
          'Publicação, acompanhamento durante o ar e um fechamento com o que a mecânica entregou contra o objetivo.',
      },
    ],
    related: [
      { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca em VR' },
      { to: '/games', label: 'TENKA Games' },
      { to: '/tech/sites', label: 'Landing page da campanha' },
    ],
    ctaLabel: 'Falar sobre um advergame',
  },
  {
    path: '/studios/maquete-eletronica-3d',
    parent: '/studios',
    parentLabel: 'TENKA Studios',
    accent: STUDIOS_ACCENT,
    problem: {
      title: 'Vender o que ainda não existe',
      body: 'O lançamento precisa de imagem antes da obra, e a imagem precisa sustentar o preço. Render técnico mostra o projeto; peça de campanha vende o empreendimento. A diferença está em enquadramento, luz, paisagismo, vida na cena e no acabamento que o material de venda exige — e é essa diferença que decide se o stand converte.',
    },
    includes: [
      {
        title: 'Fachada e implantação',
        description:
          'A imagem-âncora do lançamento, em versão diurna e noturna, com o entorno tratado para o produto se destacar.',
      },
      {
        title: 'Áreas comuns e decorados',
        description:
          'Lazer, hall, fachada ativa e unidades tipo, com acabamento alinhado ao memorial.',
      },
      {
        title: 'Plantas humanizadas',
        description:
          'Leitura imediata do produto no material de venda, sem o comprador precisar interpretar planta técnica.',
      },
      {
        title: 'Animação e tour',
        description:
          'Percurso pelo empreendimento quando a peça estática não dá conta — produzido da mesma cena.',
      },
      {
        title: 'Formatos de campanha',
        description:
          'Recortes para stand, anúncio, portal imobiliário e redes, a partir das mesmas imagens aprovadas.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Leitura do projeto',
        description:
          'Plantas, cortes, implantação e memorial de acabamentos. Definimos quais imagens o material de venda realmente precisa.',
      },
      {
        step: '02',
        title: 'Volumetria em cinza',
        description:
          'Enquadramento e câmera aprovados antes de qualquer material. Mudar aqui custa barato; mudar depois refaz a cena.',
      },
      {
        step: '03',
        title: 'Materiais e luz',
        description:
          'Acabamentos, paisagismo e estudo de luz, na rodada em que o empreendimento ganha a cara final.',
      },
      {
        step: '04',
        title: 'Finalização',
        description:
          'Tratamento, ajuste fino e entrega nos formatos de cada peça da campanha.',
      },
    ],
    related: [
      { to: '/studios/mockup-3d-de-produto', label: 'Mockup 3D de produto' },
      { to: '/studios', label: 'TENKA Studios' },
      { to: '/tech/sites', label: 'Site do lançamento' },
    ],
    ctaLabel: 'Pedir orçamento de maquete 3D',
  },
  {
    path: '/studios/mockup-3d-de-produto',
    parent: '/studios',
    parentLabel: 'TENKA Studios',
    accent: STUDIOS_ACCENT,
    problem: {
      title: 'A campanha pronta e o produto ainda no molde',
      body: 'O cronograma de marketing raramente espera o protótipo físico ficar pronto, e quando fica, ele vem numa cor só. Fotografar cada variação significa nova diária, novo frete e nova agenda. Um modelo 3D bem construído resolve a primeira campanha e todas as próximas: cor nova, rótulo novo e ângulo novo passam a ser renderização, não produção.',
    },
    includes: [
      {
        title: 'Packshot publicitário',
        description:
          'Produto isolado com acabamento de anúncio, nos enquadramentos que e-commerce e marketplace exigem.',
      },
      {
        title: 'Variações do mesmo modelo',
        description:
          'Cor, sabor, volume e rótulo trocados sem refazer nada — é onde o 3D paga a diferença para a foto.',
      },
      {
        title: 'Cena de campanha',
        description:
          'Produto em contexto, com direção de arte, luz e composição pensadas para a peça final.',
      },
      {
        title: 'Validação de embalagem',
        description:
          'Ver o rótulo aplicado no volume real antes de fechar a arte com a gráfica.',
      },
      {
        title: 'Animação de produto',
        description:
          'Movimento, abertura e explodida quando a peça precisa mostrar o que a imagem parada não mostra.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Referências',
        description:
          'Desenho técnico ou fotos com escala, arte do rótulo em vetor e o acabamento pretendido.',
      },
      {
        step: '02',
        title: 'Modelagem',
        description:
          'Construção do volume e aprovação da forma em cinza, antes de materiais.',
      },
      {
        step: '03',
        title: 'Materiais e luz',
        description:
          'Acabamento, transparência, metalização e o estudo de luz que define o caráter da peça.',
      },
      {
        step: '04',
        title: 'Entrega e variações',
        description:
          'Renderização final nos formatos de cada canal, e as variações geradas a partir da mesma cena.',
      },
    ],
    related: [
      { to: '/studios/maquete-eletronica-3d', label: 'Maquete eletrônica 3D' },
      { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual e branding' },
      { to: '/studios', label: 'TENKA Studios' },
    ],
    ctaLabel: 'Pedir orçamento de mockup 3D',
  },
  {
    path: '/studios/identidade-visual-e-branding',
    parent: '/studios',
    parentLabel: 'TENKA Studios',
    accent: STUDIOS_ACCENT,
    problem: {
      title: 'Logo bonito não é marca',
      body: 'A maior parte dos projetos de marca que dão errado começa pedindo um logotipo. Sem posicionamento definido, a escolha vira gosto — e gosto muda a cada pessoa nova no time. Seis meses depois a marca tem cinco versões do símbolo, três azuis diferentes e ninguém sabe qual é o certo, porque nunca existiu um critério para decidir.',
    },
    includes: [
      {
        title: 'Posicionamento e território',
        description:
          'O lugar que a marca ocupa, contra quem, e o tom que ela usa. É o que torna as decisões visuais discutíveis por argumento.',
      },
      {
        title: 'Símbolo e logotipo',
        description:
          'Desenho que funciona do favicon ao letreiro, com as versões que a aplicação real exige.',
      },
      {
        title: 'Sistema visual',
        description:
          'Paleta, tipografia, grafismos e regras de composição — o que faz uma peça parecer da marca mesmo sem o logo.',
      },
      {
        title: 'Aplicações',
        description:
          'Papelaria, digital, social, sinalização e campanha, testadas durante o projeto e não depois.',
      },
      {
        title: 'Manual de marca',
        description:
          'Para o time e os fornecedores aplicarem sem supervisão. É o que faz a identidade sobreviver à rotatividade.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Leitura',
        description:
          'Negócio, público, concorrência e o que a marca precisa deixar de ser.',
      },
      {
        step: '02',
        title: 'Direção',
        description:
          'Territórios visuais com argumento, para escolher por critério e não por preferência pessoal.',
      },
      {
        step: '03',
        title: 'Construção',
        description:
          'Símbolo, sistema e aplicações desenvolvidos juntos, testados nas peças que a marca mais usa.',
      },
      {
        step: '04',
        title: 'Manual e entrega',
        description:
          'Arquivos em todos os formatos, manual de aplicação e passagem para quem vai operar a marca.',
      },
    ],
    related: [
      { to: '/studios/mockup-3d-de-produto', label: 'Mockup 3D de produto' },
      { to: '/tech/sites', label: 'Site a partir da nova identidade' },
      { to: '/studios', label: 'TENKA Studios' },
    ],
    ctaLabel: 'Falar sobre a marca',
  },
  {
    path: '/tech/automacoes-e-agentes-de-ia',
    parent: '/tech',
    parentLabel: 'TENKA Tech',
    accent: TECH_ACCENT,
    problem: {
      title: 'A equipe que trabalha de ponte entre sistemas',
      body: 'Alguém exporta do sistema A, confere na planilha, digita no sistema B e avisa no WhatsApp. Esse trabalho não aparece em nenhum organograma, consome horas de gente cara todo dia e é onde nascem os erros que ninguém consegue rastrear. Automatizar isso raramente exige IA — exige mapear o processo. A IA entra onde existe julgamento, não onde existe cópia.',
    },
    includes: [
      {
        title: 'Mapeamento do processo',
        description:
          'Antes da ferramenta. Metade do ganho costuma vir de eliminar etapas, não de automatizá-las.',
      },
      {
        title: 'Integração entre sistemas',
        description:
          'ERP, CRM, planilhas, e-mail e ferramentas internas conversando por API e webhook.',
      },
      {
        title: 'Agentes de IA com acesso a dados',
        description:
          'Consultam seus sistemas em tempo real, decidem com contexto e executam — não respondem de um roteiro.',
      },
      {
        title: 'Atendimento automatizado',
        description:
          'Triagem e qualificação no WhatsApp e no site, com escalonamento para humano onde o custo do erro é alto.',
      },
      {
        title: 'Log e tratamento de erro',
        description:
          'O que o agente fez, por quê e onde falhou, com política de repetição. Automação sem isso é dívida.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Mapear',
        description:
          'Acompanhamos o processo como ele é hoje, com quem executa — não como está no fluxograma.',
      },
      {
        step: '02',
        title: 'Cortar',
        description:
          'Eliminamos o que não precisa existir antes de automatizar. Automatizar desperdício é desperdício mais rápido.',
      },
      {
        step: '03',
        title: 'Construir',
        description:
          'Fluxo, integrações e agentes, com a ferramenta escolhida em função do processo e não ao contrário.',
      },
      {
        step: '04',
        title: 'Operar',
        description:
          'Acompanhamento em produção, ajuste dos casos de borda que só aparecem com volume real e treinamento do time.',
      },
    ],
    sections: [
      {
        title: 'Onde a IA ajuda e onde ela atrapalha',
        body: 'IA compensa quando a tarefa exige interpretar texto livre, classificar algo ambíguo ou decidir com contexto que não cabe numa regra. Para mover dado de um campo a outro, uma integração comum é mais barata, mais rápida e infinitamente mais previsível. A escolha errada aqui é cara nos dois sentidos: usar IA onde uma regra bastava gera custo e imprevisibilidade; usar regra onde havia julgamento gera um fluxo que quebra no primeiro caso fora do padrão.',
      },
    ],
    related: [
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/tech', label: 'TENKA Tech' },
      { to: '/games/advergame-e-gamificacao', label: 'Gamificação de adoção interna' },
    ],
    ctaLabel: 'Falar sobre automação',
  },
  {
    path: '/tech/sistemas-sob-medida',
    parent: '/tech',
    parentLabel: 'TENKA Tech',
    accent: TECH_ACCENT,
    problem: {
      title: 'Quando a planilha vira o sistema da empresa',
      body: 'Começa com uma aba. Vira cinco arquivos, três versões circulando por e-mail e uma pessoa que é a única que entende as fórmulas. O custo não aparece como despesa — aparece como retrabalho, erro de cobrança, decisão tomada com número velho e um risco operacional concentrado em quem pode sair da empresa amanhã.',
    },
    includes: [
      {
        title: 'O seu fluxo, não o do fornecedor',
        description:
          'Cadastros e operação modelados em cima de como a empresa funciona, incluindo as exceções que todo sistema pronto ignora.',
      },
      {
        title: 'Autenticação e permissões',
        description:
          'Cada papel vê e faz exatamente o que deve, com a regra aplicada no servidor e não só na interface.',
      },
      {
        title: 'Cobrança e assinaturas',
        description:
          'Recorrência, parcelamento, inadimplência e conciliação — a parte que costuma derrubar projeto feito pela metade.',
      },
      {
        title: 'Dashboards que decidem',
        description:
          'Os números que mudam a ação do dia, não vinte gráficos que ninguém abre.',
      },
      {
        title: 'Integrações',
        description:
          'Com o que a empresa já usa, por API e webhook, incluindo o que precisa continuar funcionando durante a migração.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Mapear',
        description:
          'Operação, papéis, exceções e qual dor justifica o projeto existir.',
      },
      {
        step: '02',
        title: 'Arquitetar',
        description:
          'Dados, permissões e integrações decididos antes de construir, porque são o que custa caro para mudar depois.',
      },
      {
        step: '03',
        title: 'Construir em fatias',
        description:
          'A primeira entrega já resolve alguma dor sozinha e entra em uso, para o resto ser decidido com o sistema rodando.',
      },
      {
        step: '04',
        title: 'Operar',
        description:
          'Publicação, monitoramento, correção e evolução — com o código e a infraestrutura na conta do cliente.',
      },
    ],
    related: [
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automação e agentes de IA' },
      { to: '/tech/sites', label: 'Site institucional' },
      { to: '/tech', label: 'TENKA Tech' },
    ],
    ctaLabel: 'Falar sobre um sistema',
  },
  {
    path: '/tech/sites',
    parent: '/tech',
    parentLabel: 'TENKA Tech',
    accent: TECH_ACCENT,
    problem: {
      title: 'O site que existe e não trabalha',
      body: 'Boa parte dos sites institucionais cumpre o papel de endereço: está lá, é bonito, e não traz um contato por mês. Costuma ser a soma de três coisas — demora a carregar no celular, não tem uma página para cada coisa que as pessoas procuram, e não conduz ninguém a lugar nenhum. As três têm conserto, e nenhuma delas é redesenhar por redesenhar.',
    },
    includes: [
      {
        title: 'Uma página por intenção',
        description:
          'Cada serviço que o cliente busca separadamente merece a própria URL. Serviço escondido dentro de um one-pager não ranqueia e não dá para anunciar.',
      },
      {
        title: 'Performance como requisito',
        description:
          'Core Web Vitals tratados durante o projeto, não auditados depois de pronto. Peso de imagem e de script entram no orçamento técnico.',
      },
      {
        title: 'SEO técnico resolvido',
        description:
          'Título e descrição por página, dados estruturados, canonical, sitemap e HTML legível sem depender de JavaScript.',
      },
      {
        title: 'Conversão desenhada',
        description:
          'O caminho do visitante até o contato, com medição ponta a ponta de qual página originou o lead.',
      },
      {
        title: 'CMS para o time',
        description:
          'Texto, imagem e conteúdo editáveis sem pedir deploy — e sem abrir a estrutura para se degradar.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Mapear intenções',
        description:
          'O que as pessoas de fato procuram quando precisam do que você vende — é isso que define a árvore de páginas.',
      },
      {
        step: '02',
        title: 'Estrutura e conteúdo',
        description:
          'Arquitetura, títulos e texto de cada página, antes do layout. Layout sem conteúdo é decoração.',
      },
      {
        step: '03',
        title: 'Construir',
        description:
          'Design e front-end no mesmo ciclo, com performance e SEO técnico verificados a cada entrega.',
      },
      {
        step: '04',
        title: 'Publicar e medir',
        description:
          'Search Console, analytics e acompanhamento das primeiras semanas para corrigir com dado real.',
      },
    ],
    related: [
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual' },
      { to: '/tech', label: 'TENKA Tech' },
    ],
    ctaLabel: 'Falar sobre um site',
  },
];

export function serviceContentFor(path: string): ServiceContent | undefined {
  return SERVICE_CONTENT.find((content) => content.path === path);
}

/** Páginas filhas de uma divisão, para o hub linkar os filhos. */
export function servicesUnder(parent: string): SeoRoute[] {
  const paths = new Set(
    SERVICE_CONTENT.filter((content) => content.parent === parent).map((c) => c.path),
  );
  return SERVICE_ROUTES.filter((route) => paths.has(route.path));
}
