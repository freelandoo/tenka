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
];
