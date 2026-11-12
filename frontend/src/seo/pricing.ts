import type { SeoRoute } from './routes';
import type { ServiceContent } from './services';

/**
 * Páginas de "quanto custa".
 *
 * Por que existem: nas SERPs de preço desses serviços quem ranqueia é
 * marketplace — GetNinjas e oHub — e não quem presta o serviço. É o prestador
 * que tem a informação boa, e é ele que perde o lead para o intermediário.
 *
 * Regra que estas páginas seguem: **nenhum preço da TENKA é publicado aqui.**
 * Não porque seja segredo, mas porque um número sem escopo é mentira útil para
 * ninguém: atrai quem compara preço de coisas diferentes e afasta quem tinha o
 * projeto certo. O que a página entrega no lugar é melhor para quem busca —
 * quais variáveis movem o orçamento, o que encarece sem agregar, e o que
 * precisa estar definido para sair um número confiável.
 *
 * Elas vivem como filhas da página de serviço correspondente: o caminho carrega
 * a palavra-chave inteira e o breadcrumb sai de graça.
 */

export const PRICING_ROUTES: SeoRoute[] = [
  {
    path: '/games/treinamento-em-realidade-virtual/quanto-custa',
    title: 'Quanto custa um treinamento em realidade virtual | TENKA',
    description:
      'O que define o preço de um treinamento em VR: número de cenários, fidelidade do ambiente, avaliação, equipamento e operação. Sem pacote fechado.',
    h1: 'Quanto custa um treinamento em realidade virtual',
    intro:
      'Não existe preço de tabela para treinamento em VR, e qualquer número dito antes de conhecer a operação é chute. O que existe são variáveis que mexem no orçamento de forma previsível — e dá para estimar a ordem de grandeza do seu caso sabendo quais são.',
    highlights: [
      'Quantidade de cenários e de procedimentos cobertos',
      'Fidelidade do ambiente — galpão genérico ou a sua planta reconstruída',
      'Profundidade da avaliação — concluir o cenário ou medir cada decisão',
      'Equipamento: usar o parque existente, comprar ou operar em formato de turma',
      'Operação: aplicação pela sua equipe ou com operador da TENKA no local',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Por que vocês não publicam uma tabela de preços?',
        answer:
          'Porque o mesmo pedido — "um treinamento de NR-35 em VR" — pode ser um cenário único com avaliação simples ou seis cenários com a planta da fábrica reconstruída, analytics por colaborador e operação em turma. Publicar um número faria você comparar propostas que entregam coisas diferentes, que é exatamente o problema que leva empresa a contratar errado.',
      },
      {
        question: 'O que mais encarece um projeto de VR?',
        answer:
          'Na ordem: a quantidade de cenários distintos, a fidelidade do ambiente ao local real e a profundidade da avaliação. Reconstruir a sua planta com precisão custa mais que usar um ambiente genérico, e medir cada decisão custa mais que apenas registrar quem concluiu. Nem sempre o mais caro é o certo — depende do que a empresa vai fazer com o dado.',
      },
      {
        question: 'Como fica o custo por colaborador treinado?',
        answer:
          'O simulador é um custo de produção, pago uma vez; o treinamento roda quantas vezes a empresa quiser, inclusive nas reciclagens que a norma exige. Por isso o custo por colaborador cai a cada turma, e a comparação justa não é contra uma turma de treinamento tradicional, é contra o ciclo inteiro de reciclagens ao longo dos anos.',
      },
      {
        question: 'Dá para começar pequeno?',
        answer:
          'Dá, e costuma ser o caminho mais barato de descobrir se faz sentido: um cenário, um procedimento, uma turma-piloto. Se o resultado aparecer, expandir reaproveita o ambiente já construído. Se não aparecer, você descobriu com uma fração do investimento.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/studios/maquete-eletronica-3d/quanto-custa',
    title: 'Quanto custa uma maquete eletrônica 3D | TENKA Studios',
    description:
      'O que define o preço de uma maquete eletrônica: número de imagens, nível de acabamento, paisagismo, interiores e se haverá animação ou tour.',
    h1: 'Quanto custa uma maquete eletrônica 3D',
    intro:
      'O preço de uma maquete eletrônica é quase sempre decidido por três coisas: quantas imagens o material de venda precisa, qual o acabamento exigido e quanto o projeto ainda vai mudar depois do orçamento. A terceira é a que mais surpreende incorporadora.',
    highlights: [
      'Quantidade de imagens — fachada, implantação, áreas comuns, decorados',
      'Acabamento — render técnico ou peça com padrão de campanha',
      'Paisagismo, entorno e vida na cena, que mudam o tempo de produção',
      'Interiores, que são cenas novas e não variações da fachada',
      'Animação e tour, que reaproveitam a cena mas somam produção',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'O preço é por imagem?',
        answer:
          'Em parte. A primeira imagem carrega o custo de montar a cena inteira — modelagem, materiais, luz e entorno; as seguintes, a partir dessa mesma cena, custam bem menos. Por isso pedir cinco imagens não custa cinco vezes uma, e por isso definir o pacote antes de começar sai mais barato que pedir uma de cada vez.',
      },
      {
        question: 'O que encarece sem agregar?',
        answer:
          'Mudança de projeto depois do aceite da volumetria. Alterar pé-direito, posição de torre ou fachada depois que materiais e luz foram aplicados não é ajuste, é refazer a cena. É por isso que trabalhamos com aprovação travada em cinza antes de qualquer acabamento.',
      },
      {
        question: 'Vale contratar a animação junto?',
        answer:
          'Quase sempre. A cena construída para as imagens é a mesma que alimenta a animação, então produzir os dois no mesmo projeto custa menos que contratar a animação meses depois, com outro fornecedor, a partir do zero.',
      },
      {
        question: 'Qual informação acelera o orçamento?',
        answer:
          'Projeto arquitetônico (plantas, cortes e fachadas), implantação, memorial de acabamentos e a lista de peças que o material de venda vai precisar. Com isso o orçamento sai fechado; sem isso, sai uma faixa.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/studios/identidade-visual-e-branding/quanto-custa',
    title: 'Quanto custa uma identidade visual | TENKA Studios',
    description:
      'O que define o preço de uma identidade visual: escopo de marca, número de aplicações, arquitetura de submarcas e profundidade do manual.',
    h1: 'Quanto custa uma identidade visual',
    intro:
      'A faixa de preço de identidade visual no mercado é larga porque a palavra cobre coisas muito diferentes: de um logotipo entregue em PNG a um sistema de marca com arquitetura de submarcas e manual de aplicação. Antes de comparar propostas, vale entender o que cada uma está entregando.',
    highlights: [
      'Escopo real — logotipo, identidade visual ou branding (são três coisas)',
      'Quantidade de aplicações desenhadas e testadas durante o projeto',
      'Arquitetura de marca — uma marca ou um sistema com submarcas',
      'Profundidade do manual, que é o que faz a marca sobreviver à equipe',
      'Rodadas de aprovação e quem decide do lado do cliente',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'Por que as propostas variam tanto de preço?',
        answer:
          'Porque raramente estão orçando a mesma coisa. Uma proposta pode cobrir só o desenho do logotipo; outra, posicionamento, sistema visual completo, aplicações testadas e manual. Comparar as duas pelo valor é comparar um pneu com um carro. O primeiro passo útil é pedir que cada proposta liste os entregáveis.',
      },
      {
        question: 'Qual a diferença de preço entre logotipo e branding?',
        answer:
          'É uma diferença de ordem de grandeza, não de percentual, porque são trabalhos distintos. Logotipo é um desenho; branding é posicionamento, território, sistema e regras, com o logotipo como uma das saídas. Contratar só o logo é mais barato e costuma gerar retrabalho quando a marca precisa existir em mais de um lugar.',
      },
      {
        question: 'Existe referência de mercado?',
        answer:
          'Existe, e vale olhar com cuidado. Marketplaces de serviço publicam faixas amplas — o GetNinjas, por exemplo, divulga uma faixa de R$ 1.700 a R$ 7.500 para projeto de identidade visual. São números de terceiros, não da TENKA, e refletem escopos muito diferentes entre si. Servem para calibrar expectativa, não para orçar o seu caso.',
      },
      {
        question: 'O que acelera o orçamento?',
        answer:
          'Saber onde a marca precisa aparecer. Uma lista honesta de aplicações — site, embalagem, frota, fachada, uniforme, redes — define o escopo melhor que qualquer briefing genérico, e é o que separa um orçamento fechado de uma faixa.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/tech/sites/quanto-custa',
    title: 'Quanto custa um site profissional | TENKA Tech',
    description:
      'O que define o preço de um site: número de páginas de intenção, CMS, integrações, produção de conteúdo e se haverá manutenção contínua.',
    h1: 'Quanto custa um site profissional',
    intro:
      'Número de páginas, sozinho, não diz quase nada sobre o preço de um site. O que move o orçamento é quantas intenções de busca o site precisa atender, se o time vai editar o conteúdo sozinho, com o que o site precisa se integrar e quem escreve o texto.',
    highlights: [
      'Páginas de intenção — cada serviço que o cliente busca separadamente',
      'CMS, para o time editar sem pedir deploy',
      'Integrações — CRM, pagamento, agendamento, automação',
      'Produção de conteúdo, que costuma ser o item esquecido no orçamento',
      'Manutenção e evolução depois do lançamento',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Por que site barato costuma sair caro?',
        answer:
          'Porque o que normalmente é cortado para o preço fechar é justamente o que faz o site trazer contato: estrutura de páginas por intenção, performance, SEO técnico e conteúdo. O resultado é um site que existe, é bonito e não traz um orçamento por mês — e aí o custo real vira o refazimento dois anos depois.',
      },
      {
        question: 'O conteúdo está incluso?',
        answer:
          'Precisa estar explícito na proposta, de um lado ou de outro. Muita proposta pressupõe que o cliente entrega os textos, e o projeto trava por meses esperando. Se a TENKA escreve, isso entra no escopo e no prazo; se o cliente escreve, o cronograma registra essa dependência.',
      },
      {
        question: 'Quanto custa manter o site depois?',
        answer:
          'Hospedagem e domínio são baratos e previsíveis. O que varia é a evolução: um site institucional estável pede pouco; um site que ganha páginas, campanhas e integrações pede acompanhamento mensal. A conta honesta considera os dois anos seguintes, não só a entrega.',
      },
      {
        question: 'Qual a forma mais barata de ter um bom orçamento?',
        answer:
          'Chegar com a lista de páginas que o site precisa ter e o que cada uma deve fazer acontecer. Isso costuma reduzir escopo em vez de aumentar — é comum descobrir que metade das páginas pedidas não atende intenção nenhuma.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/tech/sistemas-sob-medida/quanto-custa',
    title: 'Quanto custa um sistema sob medida | TENKA Tech',
    description:
      'O que define o preço de um sistema sob medida: complexidade das regras de negócio, integrações, usuários e papéis, migração de dados e operação.',
    h1: 'Quanto custa um sistema sob medida',
    intro:
      'Não dá para precificar "um sistema" pela quantidade de telas — duas telas podem esconder a regra de negócio mais cara do projeto. O que move o orçamento é a complexidade das regras, com o que o sistema precisa se integrar e quantos papéis diferentes ele atende. Esta página mostra essas variáveis antes de qualquer conversa.',
    highlights: [
      'Regras de negócio — a lógica por trás das telas, não a contagem delas',
      'Integrações — ERP, pagamento, nota fiscal e os sistemas que já rodam',
      'Usuários e papéis — cada perfil com o que vê e o que pode fazer',
      'Dados e migração — trazer o que já existe em planilha ou sistema antigo',
      'Operação depois da entrega — hospedagem, suporte e evolução',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Por que ninguém publica o preço de um sistema sob medida?',
        answer:
          'Porque o mesmo pedido — "um sistema para gerir a minha operação" — pode ser um cadastro com relatório ou uma plataforma com cobrança recorrente, vários perfis e integração fiscal. Um número dito antes de conhecer as regras de negócio compara projetos que não têm nada em comum. No lugar do número, esta página entrega as variáveis que o movem.',
      },
      {
        question: 'O que pesa mais: as telas ou as regras?',
        answer:
          'As regras, quase sempre. Uma tela de cadastro é barata; a lógica que decide o que acontece quando um pedido é aprovado, estornado ou parcelado é onde o esforço se concentra. Por isso contar telas engana — um sistema "pequeno" de poucas telas pode carregar a parte mais difícil do projeto.',
      },
      {
        question: 'Sai mais barato usar um sistema pronto?',
        answer:
          'Com frequência, sim — e quando é o caso, dizemos. O sob medida compensa quando a soma das assinaturas e das gambiarras de integração já passou do custo de ter o seu, ou quando o processo é a sua vantagem e o sistema de prateleira obriga a abrir mão dela. Se o pronto resolve, a resposta honesta é usar o pronto.',
      },
      {
        question: 'Dá para diluir o custo ao longo do tempo?',
        answer:
          'Dá, e costuma ser o caminho mais seguro: entregamos em fatias, começando pela parte que já resolve uma dor sozinha e entra em uso cedo. O resto do escopo é decidido com o sistema rodando, o que evita pagar por função que a operação real mostrou ser desnecessária.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/tech/automacoes-e-agentes-de-ia/quanto-custa',
    title: 'Quanto custa automatizar atendimento e processos com IA | TENKA',
    description:
      'O que define o preço de uma automação com IA: número de processos, integrações, se é fluxo ou agente que decide, e o tratamento de erro.',
    h1: 'Quanto custa automatizar processos e atendimento com IA',
    intro:
      'O mercado de automação com IA vai de uma assinatura mensal de ferramenta pronta a um projeto de integração sob medida — e os dois resolvem problemas diferentes. O que define o custo é quantos processos entram, com o que eles se integram e se o caso pede um fluxo simples ou um agente que decide. Às vezes a resposta mais barata é não usar IA.',
    highlights: [
      'Número de processos automatizados e a frequência de cada um',
      'Integrações — WhatsApp oficial, CRM, ERP, agenda e sistemas da operação',
      'Fluxo determinístico ou agente de IA — nem todo caso pede IA',
      'Tratamento de erro e escalonamento para humano onde o erro custa caro',
      'Ferramenta pronta (mensalidade) ou desenvolvimento próprio (uma vez)',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Automatizar com IA é caro?',
        answer:
          'Varia mais do que quase qualquer outro serviço de tecnologia, porque "automação com IA" vai de ligar uma ferramenta pronta a construir uma integração sob medida entre vários sistemas. O que decide é quantos processos entram e com o que precisam conversar — não o rótulo "IA".',
      },
      {
        question: 'Preciso mesmo de IA, ou um fluxo resolve?',
        answer:
          'Muitas vezes um fluxo com perguntas e caminhos bem definidos é mais previsível, mais barato e mais fácil de manter que um agente de IA — e dizemos isso quando é o caso. IA compensa quando a conversa é aberta, quando é preciso consultar dados e decidir com contexto, ou quando o roteiro fixo já não dá conta. Metade do ganho costuma vir de eliminar etapas, não de colocar IA nelas.',
      },
      {
        question: 'O custo é único ou mensal?',
        answer:
          'Os dois existem e é importante separá-los. Uma ferramenta pronta tem mensalidade por usuário ou por volume. Uma automação sob medida tem o custo de construção, pago uma vez, mais hospedagem e manutenção. O que a TENKA faz com frequência é integrar a ferramenta que você já paga à sua operação, em vez de somar mais uma assinatura.',
      },
      {
        question: 'E se a automação errar com um cliente?',
        answer:
          'Automação sem tratamento de erro é dívida, não ganho. Todo fluxo entregue tem log, política de repetição e escalonamento para humano nos pontos em que o custo do erro é alto. Em atendimento ou processo financeiro, o padrão é o agente propor e uma pessoa confirmar — e isso faz parte do orçamento, não é um extra.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/tech/aplicativos/quanto-custa',
    title: 'Quanto custa desenvolver um aplicativo | TENKA Tech',
    description:
      'O que define o preço de um aplicativo: back-end e integrações, nativo ou multiplataforma, publicação nas lojas e a operação depois do lançamento.',
    h1: 'Quanto custa desenvolver um aplicativo',
    intro:
      'O app raramente é só a tela, e é por isso que o orçamento surpreende. O que move o preço é o back-end por trás do aplicativo, se ele precisa ser nativo ou multiplataforma, com o que se integra e o custo de manter de pé depois de publicado. E, antes de tudo isso: às vezes um site resolve mais barato.',
    highlights: [
      'Back-end, API e autenticação — o app quase nunca é só a interface',
      'Nativo ou multiplataforma — uma base de código ou duas',
      'Integrações — pagamento, notificação, mapa e sistemas da empresa',
      'Publicação nas lojas Apple e Google, com a revisão conduzida',
      'Operação depois do lançamento — as lojas e os sistemas mudam',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Por que um app custa mais do que parece?',
        answer:
          'Porque a tela é a ponta visível. Por trás dela há back-end, autenticação, integração, notificação e a infraestrutura que mantém tudo no ar — mais o processo de publicar em duas lojas com regras próprias. Orçar pelo que se vê na tela é a origem da surpresa no meio do projeto.',
      },
      {
        question: 'Preciso mesmo de um app, ou um site resolve?',
        answer:
          'Se o uso é esporádico ou vem de campanha, um site rápido quase sempre converte mais, porque não exige instalação. App compensa quando há uso recorrente, necessidade de funcionar offline, notificação como parte do produto ou acesso ao hardware do aparelho. Essa conversa vem antes do orçamento, porque pode cortar o custo pela metade.',
      },
      {
        question: 'Nativo ou multiplataforma muda muito o preço?',
        answer:
          'Muda. Multiplataforma mantém uma base de código para iOS e Android e reduz custo e prazo — cobre bem a maioria dos apps de negócio. Nativo (duas bases) compensa quando há exigência pesada de performance gráfica ou integração profunda com o sistema. A decisão sai dos requisitos, e é uma das que mais mexem no total.',
      },
      {
        question: 'Tem custo depois de publicar?',
        answer:
          'Tem, e é parte do projeto, não um extra. As lojas mudam requisitos, os sistemas operacionais atualizam e o uso real revela o que o teste não pegou. App sem manutenção para de funcionar sozinho em um ou dois ciclos de atualização. A conta honesta considera o ano seguinte ao lançamento.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
];

const PRICE_PROCESS = [
  {
    step: '01',
    title: 'Conversa de entendimento',
    description: 'Objetivo, público, prazo e o que precisa estar operando no fim.',
  },
  {
    step: '02',
    title: 'Escopo escrito',
    description: 'Lista do que entra e do que não entra — é o que torna propostas comparáveis.',
  },
  {
    step: '03',
    title: 'Proposta',
    description: 'Valor, prazo, etapas de aprovação e o que acontece se o escopo mudar.',
  },
  {
    step: '04',
    title: 'Ajuste',
    description: 'Se o número não couber, cortamos escopo junto — não qualidade em silêncio.',
  },
];

const DISCLAIMER = {
  title: 'Sobre os números desta página',
  body: 'A TENKA não publica tabela de preços, e nenhum valor citado aqui é preço da TENKA. Onde há referência de mercado, ela vem de terceiros e está identificada como tal, servindo para calibrar expectativa — não para orçar o seu caso. Orçamento sai depois de uma conversa de entendimento, com escopo escrito.',
};

export const PRICING_CONTENT: ServiceContent[] = [
  {
    path: '/games/treinamento-em-realidade-virtual/quanto-custa',
    parent: '/games/treinamento-em-realidade-virtual',
    parentLabel: 'Treinamento em VR',
    accent: '#FF6A0A',
    problem: {
      title: 'O número que ninguém dá, e por quê',
      body: 'Quem pesquisa preço de treinamento em VR quase sempre encontra "fale conosco" ou um valor que não significa nada. O motivo real é que o mesmo pedido pode descrever projetos de tamanhos muito diferentes: um cenário único com avaliação simples, ou a sua planta reconstruída com seis procedimentos e analytics por colaborador. Em vez do número, esta página entrega as variáveis — com elas dá para estimar a ordem de grandeza antes mesmo de falar com alguém.',
    },
    includes: [
      {
        title: 'Número de cenários',
        description:
          'A variável de maior peso. Cada procedimento distinto é um cenário com lógica, avaliação e teste próprios.',
      },
      {
        title: 'Fidelidade do ambiente',
        description:
          'Ambiente genérico ensina o conceito e custa menos; a sua planta reconstruída ensina o trabalho e custa mais.',
      },
      {
        title: 'Profundidade da avaliação',
        description:
          'Registrar quem concluiu é simples. Medir cada decisão, tempo e erro é o que vira diagnóstico — e soma produção.',
      },
      {
        title: 'Equipamento',
        description:
          'Usar o parque que a empresa já tem, comprar, ou operar em formato de turma com equipamento nosso.',
      },
      {
        title: 'Operação',
        description:
          'Treinar seus instrutores para aplicarem sozinhos, ou ter operador da TENKA no local a cada turma.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [
      {
        title: 'A comparação que costuma ser feita errada',
        body: 'É comum comparar o valor do simulador com o de uma turma de treinamento tradicional, e concluir que VR é caro. A comparação justa é outra: o simulador é produzido uma vez e aplicado em todas as turmas, inclusive nas reciclagens que a norma exige a cada um ou dois anos. Somando o ciclo inteiro, mais o custo de parar operação para montar prática real, a conta muda bastante. Também entra na conta o que não aparece na planilha: o acidente que não aconteceu porque a pessoa já tinha errado no cenário.',
      },
      DISCLAIMER,
    ],
    related: [
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em realidade virtual' },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
        label: 'NR-35 — trabalho em altura',
      },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de treinamento em VR',
  },
  {
    path: '/studios/maquete-eletronica-3d/quanto-custa',
    parent: '/studios/maquete-eletronica-3d',
    parentLabel: 'Maquete eletrônica 3D',
    accent: '#D9232E',
    problem: {
      title: 'Por que duas propostas de maquete variam tanto',
      body: 'Duas propostas para o mesmo empreendimento podem ter valores muito distantes sem que nenhuma esteja errada — elas estão orçando entregas diferentes. Uma pode cobrir três imagens de fachada em acabamento técnico; outra, o pacote completo de campanha com áreas comuns, decorados, plantas humanizadas e variações por canal. Quem compara só o total contrata a mais barata e descobre o resto depois, como extra.',
    },
    includes: [
      {
        title: 'Quantidade de imagens',
        description:
          'A primeira carrega o custo de montar a cena; as seguintes, a partir dela, custam uma fração.',
      },
      {
        title: 'Nível de acabamento',
        description:
          'Render técnico resolve aprovação interna. Peça de campanha exige luz, paisagismo e tratamento.',
      },
      {
        title: 'Interiores',
        description:
          'Decorados e áreas comuns são cenas novas, não variações da fachada — por isso pesam no orçamento.',
      },
      {
        title: 'Animação e tour',
        description:
          'Reaproveitam a cena já construída, então custam menos no mesmo projeto do que contratados depois.',
      },
      {
        title: 'Estabilidade do projeto',
        description:
          'Mudança de arquitetura depois do aceite da volumetria é o item que mais estoura orçamento.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [DISCLAIMER],
    related: [
      { to: '/studios/maquete-eletronica-3d', label: 'Maquete eletrônica 3D' },
      { to: '/studios/animacao-3d', label: 'Animação 3D' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de maquete 3D',
  },
  {
    path: '/studios/identidade-visual-e-branding/quanto-custa',
    parent: '/studios/identidade-visual-e-branding',
    parentLabel: 'Identidade visual e branding',
    accent: '#D9232E',
    problem: {
      title: 'A palavra "identidade visual" cobre coisas demais',
      body: 'É por isso que a faixa de mercado é absurdamente larga. Sob o mesmo nome cabe desde um logotipo entregue em PNG até um sistema de marca com arquitetura de submarcas, aplicações testadas e manual que sobrevive à troca de equipe. Antes de comparar valores, vale comparar listas de entregáveis — a diferença quase sempre está ali, não no preço por hora de quem desenha.',
    },
    includes: [
      {
        title: 'Escopo real contratado',
        description:
          'Logotipo, identidade visual e branding são três trabalhos distintos, com preços de ordens diferentes.',
      },
      {
        title: 'Aplicações desenhadas',
        description:
          'Cada aplicação testada durante o projeto — site, embalagem, frota, fachada — soma trabalho e evita retrabalho.',
      },
      {
        title: 'Arquitetura de marca',
        description:
          'Uma marca única é um projeto; um sistema com submarcas e regras de convivência é outro.',
      },
      {
        title: 'Profundidade do manual',
        description:
          'É o que faz a identidade continuar correta quando quem aplicar não for quem desenhou.',
      },
      {
        title: 'Rodadas e decisores',
        description:
          'Quantas aprovações, e quem decide. Projeto sem decisor definido é o que mais estica prazo e custo.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [DISCLAIMER],
    related: [
      { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual e branding' },
      { to: '/tech/sites', label: 'Site a partir da nova identidade' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de marca',
  },
  {
    path: '/tech/sites/quanto-custa',
    parent: '/tech/sites',
    parentLabel: 'Criação de sites',
    accent: '#00B8B3',
    problem: {
      title: 'Contar páginas não orça site',
      body: '"Quantas páginas?" é a primeira pergunta de quase toda proposta e é uma das que menos explica o preço. Dez páginas institucionais quase iguais são mais baratas que três páginas que precisam ranquear, converter e se integrar ao CRM. O que move o orçamento é quantas intenções de busca o site atende, quem edita o conteúdo depois e com o que ele precisa conversar.',
    },
    includes: [
      {
        title: 'Páginas de intenção',
        description:
          'Cada serviço que o cliente procura separadamente merece URL própria — e é isso que dá trabalho, não a contagem.',
      },
      {
        title: 'CMS',
        description:
          'Deixar o time editar texto e imagem sem deploy custa mais na entrega e economiza por anos.',
      },
      {
        title: 'Integrações',
        description: 'CRM, pagamento, agendamento e automação mudam o projeto de categoria.',
      },
      {
        title: 'Conteúdo',
        description:
          'O item mais esquecido do orçamento. Precisa estar explícito de que lado ele fica.',
      },
      {
        title: 'Depois do lançamento',
        description:
          'Site que ganha páginas e campanhas pede acompanhamento; site estável pede pouco.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [
      {
        title: 'Onde o barato costuma sair caro',
        body: 'Quando o preço precisa fechar num número baixo, o que é cortado raramente é o visual — é o que não aparece na reunião de aprovação: estrutura de páginas por intenção, performance no celular, SEO técnico e texto. O site entregue fica bonito e não traz contato, e a conclusão virá como "SEO não funciona para o meu negócio". O custo real aparece dois anos depois, refazendo. Vale pedir, em qualquer proposta, que esses quatro itens estejam escritos.',
      },
      DISCLAIMER,
    ],
    related: [
      { to: '/tech/sites', label: 'Criação de sites' },
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de site',
  },
  {
    path: '/tech/sistemas-sob-medida/quanto-custa',
    parent: '/tech/sistemas-sob-medida',
    parentLabel: 'Sistema sob medida',
    accent: '#00B8B3',
    problem: {
      title: 'Contar telas não orça um sistema',
      body: 'A primeira pergunta de quase toda proposta é "quantas telas?", e é uma das que menos explica o preço. Duas telas simples podem esconder a regra de negócio mais cara do projeto — a que decide o que acontece quando o dado entra. O que move o orçamento de um sistema sob medida é a complexidade das regras, o número de integrações e quantos papéis diferentes precisam de visões e permissões próprias.',
    },
    includes: [
      {
        title: 'Complexidade das regras de negócio',
        description:
          'A lógica por trás das telas — aprovações, estados, exceções. É onde o esforço se concentra, não na contagem de telas.',
      },
      {
        title: 'Integrações',
        description:
          'Cada sistema que precisa conversar com o seu — ERP, pagamento, nota fiscal, CRM — muda o projeto de categoria.',
      },
      {
        title: 'Usuários e papéis',
        description:
          'Um perfil único é simples; vários papéis com permissões distintas multiplicam as telas e os testes.',
      },
      {
        title: 'Dados e migração',
        description:
          'Trazer o histórico de uma planilha é uma coisa; de um sistema antigo com dado sujo é outra, e pesa no prazo.',
      },
      {
        title: 'Operação depois da entrega',
        description:
          'Hospedagem, monitoramento e evolução. Sistema não tem custo só de construção — tem custo de manter vivo.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [
      {
        title: 'Pronto vs. sob medida: a conta que importa',
        body: 'A comparação justa não é o preço do sistema sob medida contra a mensalidade de uma ferramenta pronta no primeiro mês. É o custo acumulado ao longo dos anos: assinaturas por usuário que crescem com a equipe, integrações mantidas na unha entre ferramentas que não foram feitas para conversar, e o processo que precisa se dobrar ao software em vez do contrário. Em muitos casos o pronto ganha essa conta — e quando ganha, é o que recomendamos. O sob medida vence quando o processo é a vantagem competitiva ou quando a soma das prateleiras já passou do custo de ter o seu.',
      },
      DISCLAIMER,
    ],
    related: [
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automações e agentes de IA' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de sistema',
  },
  {
    path: '/tech/automacoes-e-agentes-de-ia/quanto-custa',
    parent: '/tech/automacoes-e-agentes-de-ia',
    parentLabel: 'Automações e agentes de IA',
    accent: '#00B8B3',
    problem: {
      title: 'O preço de "automação com IA" não existe sem o processo',
      body: 'Pedir o preço de uma automação com IA é como pedir o preço de "uma reforma": depende inteiramente do que entra. O mesmo pedido pode ser ligar uma ferramenta pronta que você já assina, ou construir uma integração sob medida entre WhatsApp, CRM e ERP com um agente que consulta dado e age. E, antes do preço, vem uma pergunta que economiza dinheiro: esse caso precisa mesmo de IA, ou um fluxo simples resolve melhor?',
    },
    includes: [
      {
        title: 'Quantidade de processos',
        description:
          'Cada processo automatizado tem seu mapeamento, construção e teste. Um é um projeto curto; a operação inteira é outro.',
      },
      {
        title: 'Integrações',
        description:
          'Conectar ao WhatsApp oficial, ao CRM e ao ERP é o que dá trabalho — e o que faz a automação valer a pena.',
      },
      {
        title: 'Fluxo ou agente',
        description:
          'Fluxo determinístico é mais barato e previsível. Agente de IA custa mais e só compensa onde há decisão real.',
      },
      {
        title: 'Tratamento de erro',
        description:
          'Log, repetição e escalonamento para humano. É o que separa automação que ajuda de automação que cria incêndio.',
      },
      {
        title: 'Modelo de custo',
        description:
          'Ferramenta pronta é mensalidade; sob medida é construção uma vez mais manutenção. Muitas vezes o melhor é integrar a que você já paga.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [
      {
        title: 'A pergunta que economiza mais que qualquer desconto',
        body: 'Antes de orçar, vale decidir se o caso pede IA. Um fluxo com caminhos bem definidos — menu, condições, respostas prontas — é mais previsível e mais barato de manter que uma conversa aberta com um modelo, e resolve boa parte do atendimento repetitivo. A IA entra quando a pergunta é aberta, quando é preciso consultar dados e decidir com contexto, ou quando o roteiro fixo trava. Automatizar um processo ruim só faz ele dar errado mais rápido; por isso metade do ganho costuma vir de eliminar etapas antes de automatizar o resto.',
      },
      DISCLAIMER,
    ],
    related: [
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automações e agentes de IA' },
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de automação',
  },
  {
    path: '/tech/aplicativos/quanto-custa',
    parent: '/tech/aplicativos',
    parentLabel: 'Aplicativos',
    accent: '#00B8B3',
    problem: {
      title: 'A tela é a parte barata',
      body: 'O orçamento de um aplicativo surpreende porque a maior parte do trabalho não aparece na tela: back-end, autenticação, integrações, notificações e a infraestrutura que mantém tudo no ar, mais o processo de publicar em duas lojas com regras próprias. E, antes de somar tudo isso, há uma pergunta que muda o orçamento inteiro — esse caso precisa mesmo de um app, ou um site resolve mais barato?',
    },
    includes: [
      {
        title: 'Back-end e integrações',
        description:
          'O que sustenta o app por trás da tela — dados, login, pagamento, notificação. Onde o esforço de verdade está.',
      },
      {
        title: 'Nativo ou multiplataforma',
        description:
          'Uma base de código ou duas. A decisão sai dos requisitos de performance e hardware, e mexe bastante no total.',
      },
      {
        title: 'Complexidade das telas e dos fluxos',
        description:
          'Um app de consulta é simples; um com transação, estado offline e sincronização é outro projeto.',
      },
      {
        title: 'Publicação nas lojas',
        description:
          'Conta de desenvolvedor, revisão da Apple e da Google e os ajustes que cada uma exige. Conduzido, mas não instantâneo.',
      },
      {
        title: 'Operação pós-lançamento',
        description:
          'Atualização por mudança de loja e de sistema operacional. App parado degrada em um ou dois ciclos.',
      },
    ],
    process: PRICE_PROCESS,
    sections: [
      {
        title: 'Antes de orçar o app: você precisa de um app?',
        body: 'É a pergunta que mais economiza. Um site rápido converte mais que um app quando o uso é esporádico ou vem de campanha, porque não pede instalação — e instalar é o maior filtro entre o interesse e o uso. O aplicativo compensa quando há uso recorrente, necessidade real de funcionar offline, notificação como parte do produto, ou uso intensivo de recursos do aparelho. Dizer isso antes de orçar às vezes significa recomendar um projeto menor do que o cliente veio pedir — e é assim que a conta fecha de verdade.',
      },
      DISCLAIMER,
    ],
    related: [
      { to: '/tech/aplicativos', label: 'Desenvolvimento de aplicativos' },
      { to: '/tech/sites', label: 'Criação de sites' },
      { to: '/contato', label: 'Falar com a TENKA' },
    ],
    ctaLabel: 'Pedir um orçamento de aplicativo',
  },
];
