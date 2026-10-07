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

/**
 * Bloco normativo das páginas de NR.
 *
 * Existe para que a página diga, lado a lado, o que a norma exige e o que a
 * TENKA entrega — e para deixar explícito onde termina o fornecedor da
 * simulação e começa a responsabilidade legal da empresa e do profissional
 * habilitado. Página que vende treinamento de norma e é vaga nisso não é
 * ambígua por acaso; é ambígua porque vender assim é mais fácil.
 */
export interface RegulationBlock {
  /** Nome curto, ex.: "NR-35". */
  code: string;
  /** Quem a norma alcança. */
  scope: string;
  /** Exigências objetivas: carga horária, periodicidade, modalidade. */
  requirements: { label: string; value: string }[];
  /** Mudança recente relevante, quando houver. */
  update?: { title: string; body: string };
  /** Limite explícito do que a TENKA entrega. */
  disclaimer: string;
  /** Quando os dados normativos foram conferidos pela última vez. */
  checkedAt: string;
}

export interface ServiceContent {
  /** Casa com o `path` da SeoRoute correspondente. */
  path: string;
  /** Caminho da página mãe — divisão, ou outra página de serviço. */
  parent: string;
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
  /** Só nas páginas de norma regulamentadora. */
  regulation?: RegulationBlock;
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
    path: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
    title: 'Treinamento de NR-35 em realidade virtual | TENKA',
    description:
      'Simulador em VR para a prática de trabalho em altura: cenários do seu ambiente, erro sem consequência real e desempenho medido. Aplicado presencialmente.',
    h1: 'Treinamento de NR-35 (trabalho em altura) em realidade virtual',
    intro:
      'A NR-35 passou a exigir treinamento integralmente presencial. Isso não tira a realidade virtual do jogo — ao contrário: a VR é usada dentro da sala, com instrutor presente, como o recurso prático que reproduz a altura real sem expor ninguém a ela.',
    highlights: [
      'Cenários reconstruídos a partir do ambiente real da sua empresa',
      'Prática de percepção de risco, ancoragem e uso de EPI em altura',
      'Queda simulada com consequência, sem exposição real do trabalhador',
      'Registro de desempenho por trabalhador, etapa e turma',
      'Aplicação presencial, junto do instrutor — como a norma exige',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'A NR-35 pode ser feita em EAD?',
        answer:
          'Não. Desde a Portaria MTE nº 1.259/2026, publicada no Diário Oficial da União em 16 de julho de 2026, os treinamentos da NR-35 devem ser realizados integralmente na modalidade presencial — inicial, periódico e eventual. Acabou a divisão de teoria em EAD com prática presencial. As empresas têm até 16 de julho de 2027 para refazer ou complementar presencialmente a capacitação de quem foi treinado a distância.',
      },
      {
        question: 'Se precisa ser presencial, onde entra a realidade virtual?',
        answer:
          'A exigência é de modalidade presencial, não de ausência de tecnologia. O simulador roda na sala de treinamento, com o instrutor junto e a turma presente — é um recurso didático dentro do treinamento presencial, como já são maquete, talha e cinto de segurança. O que a VR acrescenta é a possibilidade de treinar a percepção de risco em altura real sem colocar ninguém em altura real.',
      },
      {
        question: 'O simulador substitui o treinamento ou o instrutor?',
        answer:
          'Não, e nós não vendemos isso. A TENKA produz o simulador; a capacitação continua sendo conduzida pelo instrutor com proficiência comprovada, sob responsabilidade do profissional qualificado em segurança do trabalho da empresa, com a carga horária e o conteúdo programático que a norma determina.',
      },
      {
        question: 'Qual a carga horária exigida pela NR-35?',
        answer:
          'A capacitação inicial exige no mínimo 8 horas, com conteúdo teórico e prático. O treinamento periódico é bienal, também com no mínimo 8 horas. A norma trata como trabalho em altura toda atividade executada acima de 2,00 metros do nível inferior onde haja risco de queda.',
      },
    ],
    priority: 0.85,
    changefreq: 'monthly',
  },
  {
    path: '/games/treinamento-em-realidade-virtual/nr-33-espaco-confinado',
    title: 'Treinamento de NR-33 em realidade virtual | TENKA',
    description:
      'Simulador em VR para espaço confinado: atmosfera, permissão de entrada, papel do vigia e emergência — praticados sem entrada real no espaço.',
    h1: 'Treinamento de NR-33 (espaço confinado) em realidade virtual',
    intro:
      'Espaço confinado é o treinamento em que a prática real é mais cara e mais arriscada de montar — e o único em que o erro mata rápido. O simulador permite entrar, medir atmosfera, errar a sequência e sofrer a consequência no cenário, quantas vezes forem necessárias.',
    highlights: [
      'Reconstrução do tanque, silo, galeria ou vaso da sua operação',
      'Avaliação de atmosfera, permissão de entrada e bloqueio de energias',
      'Papel do vigia treinado separadamente, com a visão de fora',
      'Cenários de emergência e resgate, sem exposição real',
      'Registro por função: trabalhador autorizado, vigia e supervisor',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Qual a carga horária do treinamento de NR-33?',
        answer:
          'Para trabalhador autorizado e vigia, a capacitação inicial exige no mínimo 16 horas. Para supervisor de entrada, no mínimo 40 horas. O treinamento periódico é anual, a cada 12 meses, com no mínimo 8 horas.',
      },
      {
        question: 'A NR-33 aceita EAD?',
        answer:
          'A parte teórica pode ser realizada a distância, desde que atendidos os requisitos do Anexo II da NR-1 — ambiente virtual de aprendizagem, requisitos pedagógicos, tecnológicos e administrativos. A parte prática continua exigindo realização presencial. O simulador é usado nessa etapa presencial.',
      },
      {
        question: 'Dá para treinar o vigia no simulador?',
        answer:
          'Sim, e é um dos usos mais úteis. O vigia não entra no espaço, mas é quem controla a permissão, acompanha o trabalhador e aciona a emergência — um papel que raramente é treinado com cenário próprio. No simulador, ele vive a situação da posição dele, inclusive quando algo dá errado lá dentro.',
      },
      {
        question: 'Vocês emitem o certificado?',
        answer:
          'Não. A TENKA produz o simulador e o relatório de desempenho. A capacitação, a carga horária, o conteúdo programático, o instrutor e a emissão do certificado seguem sob responsabilidade da empresa e do seu profissional qualificado em segurança do trabalho.',
      },
    ],
    priority: 0.85,
    changefreq: 'monthly',
  },
  {
    path: '/games/treinamento-em-realidade-virtual/nr-10-seguranca-em-eletricidade',
    title: 'Treinamento de NR-10 em realidade virtual | TENKA',
    description:
      'Simulador em VR para segurança em eletricidade: bloqueio e etiquetagem, sequência de manobra e risco elétrico praticados sem instalação energizada.',
    h1: 'Treinamento de NR-10 (segurança em eletricidade) em realidade virtual',
    intro:
      'Choque e arco elétrico não dão segunda chance, e a prática em instalação energizada é justamente a que não se pode improvisar. O simulador reproduz o painel, a subestação e o procedimento da sua empresa para a equipe errar a sequência onde errar não custa nada.',
    highlights: [
      'Painéis, quadros e subestações reconstruídos a partir da sua instalação',
      'Bloqueio e etiquetagem praticados passo a passo, na ordem correta',
      'Arco elétrico simulado com consequência visual e sonora',
      'Sequência de manobra, medição e liberação para trabalho',
      'Desempenho por eletricista e por etapa do procedimento',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Qual a carga horária da NR-10?',
        answer:
          'O curso básico de segurança em instalações e serviços com eletricidade exige no mínimo 40 horas, obrigatório para quem atua em instalações elétricas energizadas ou em suas proximidades. O complementar para Sistema Elétrico de Potência (SEP) exige mais 40 horas e tem o básico como pré-requisito.',
      },
      {
        question: 'De quanto em quanto tempo é a reciclagem?',
        answer:
          'A reciclagem é bienal e também é exigida em situações específicas: troca de função ou mudança de empresa, retorno de afastamento superior a três meses, e mudança de método, processo ou organização do trabalho.',
      },
      {
        question: 'A NR-10 pode ser online?',
        answer:
          'A parte teórica admite EAD nos termos do Anexo II da NR-1, mas o conteúdo prático deve ser presencial. A Portaria MTE nº 737/2026 reestruturou a norma, com vacância de um ano a partir da publicação, e reforçou a prática supervisionada considerando a realidade da organização, as características da instalação e os procedimentos de trabalho — além de restringir a validade do certificado à organização que forneceu o treinamento.',
      },
      {
        question: 'Por que isso favorece treinamento sob medida?',
        answer:
          'Porque a norma caminha para prática supervisionada na realidade da própria instalação, com certificado que não se transfere entre empresas. Um simulador construído sobre os painéis e procedimentos reais da sua operação atende exatamente esse recorte — coisa que um curso genérico de prateleira, por definição, não faz.',
      },
    ],
    priority: 0.85,
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

  {
    path: '/games/jogos-mobile',
    title: 'Desenvolvimento de jogos mobile (iOS e Android) | TENKA',
    description:
      'Desenvolvimento de jogos mobile para iOS e Android: protótipo da mecânica, produção, publicação nas lojas e evolução pós-lançamento. São Paulo.',
    h1: 'Desenvolvimento de jogos mobile para iOS e Android',
    intro:
      'Jogos pensados para o gesto, o ritmo e a rotina do celular — do primeiro protótipo jogável até a publicação na App Store e no Google Play, com a performance calibrada para o aparelho que o seu público realmente tem.',
    highlights: [
      'Protótipo da mecânica central, testado antes de escalar produção',
      'Produção completa — arte, código, áudio e interface',
      'Publicação na App Store e no Google Play, incluindo o processo de revisão',
      'Monetização e economia do jogo, quando o modelo pedir',
      'Evolução pós-lançamento com base em dados de uso reais',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Quanto tempo leva para publicar um jogo mobile?',
        answer:
          'Depende muito do escopo, mas a sequência é sempre a mesma: semanas até um protótipo jogável da mecânica central, e a partir dele o cronograma real da produção. Começar pelo protótipo é o que impede descobrir no sexto mês que a mecânica não sustenta o jogo.',
      },
      {
        question: 'Vocês publicam nas lojas ou a publicação é nossa?',
        answer:
          'Podemos conduzir a publicação, mas as contas de desenvolvedor na Apple e no Google ficam no nome do cliente. É o mesmo princípio do código e da infraestrutura: o ativo é de quem contratou, e isso evita a dependência que aparece quando o relacionamento muda.',
      },
      {
        question: 'Nativo, Unity ou híbrido?',
        answer:
          'A escolha vem do jogo. Mecânicas com simulação, física e render pesado pedem engine. Jogos mais leves, com forte componente de interface e integração, muitas vezes saem melhor e mais baratos fora dela. Decidir a tecnologia antes de definir a mecânica é a origem da maior parte do retrabalho.',
      },
      {
        question: 'Fazem jogo mobile para campanha de marca?',
        answer:
          'Fazemos, mas vale conversar sobre o formato: para campanha, um jogo de navegador costuma performar melhor, porque o usuário entra por um link em vez de instalar. App faz sentido quando a marca quer relação contínua, não um pico de campanha.',
      },
    ],
    priority: 0.7,
    changefreq: 'monthly',
  },
  {
    path: '/games/jogos-de-navegador',
    title: 'Jogos de navegador em WebGL, sem instalação | TENKA',
    description:
      'Jogos de navegador em WebGL que abrem por link no celular e no desktop: campanhas, advergames, demonstrações de produto e experiências dentro do seu site.',
    h1: 'Jogos de navegador em WebGL, acessíveis por link',
    intro:
      'Experiências jogáveis que abrem por link ou QR code, sem loja e sem instalação. É o formato com menor atrito que existe — e por isso o que melhor funciona para campanha, ativação digital e demonstração de produto.',
    highlights: [
      'WebGL rodando no navegador do celular e do desktop',
      'Entrada por link ou QR code, sem instalação e sem cadastro obrigatório',
      'Peso e carregamento tratados como requisito, porque campanha roda em 4G',
      'Integração com site, campanha, CRM e mecânica de promoção',
      'Medição de partidas, sessão e conversão desde o primeiro dia',
    ],
    ogImage: '/images/og/tenka-games.jpg',
    faq: [
      {
        question: 'Jogo de navegador roda bem em celular?',
        answer:
          'Roda, desde que seja projetado para isso. O erro comum é produzir para desktop e só depois tentar encaixar no celular — aí o peso do carregamento e o consumo de bateria derrubam a taxa de conclusão. Definimos o aparelho-alvo no início e o orçamento técnico sai dele.',
      },
      {
        question: 'Dá para colocar o jogo dentro do nosso site?',
        answer:
          'Sim, em página própria ou incorporado. Em campanha, a página própria costuma render mais, porque permite medir a origem do tráfego e otimizar o anúncio sem mexer no site.',
      },
      {
        question: 'Quanto tempo o jogo fica no ar?',
        answer:
          'O tempo que a campanha precisar. Como é web, não depende de aprovação de loja nem de atualização do usuário: ajustes entram no ar no mesmo dia, o que é uma vantagem real quando a campanha está rodando.',
      },
    ],
    priority: 0.7,
    changefreq: 'monthly',
  },

  // -------------------------------------------------------------------------
  // TENKA STUDIOS
  // -------------------------------------------------------------------------
  {
    path: '/studios/animacao-3d',
    title: 'Animação 3D para produto, marca e campanha | TENKA Studios',
    description:
      'Produção de animação 3D: filme de produto, vinheta, abertura, explodida técnica e motion com direção de arte e acabamento cinematográfico. São Paulo.',
    h1: 'Animação 3D para produto, marca e campanha',
    intro:
      'Filmes de produto, vinhetas e narrativas visuais construídos quadro a quadro — para mostrar o que câmera nenhuma alcança: o interior do produto, a escala real, o processo invisível, o que ainda não existe.',
    highlights: [
      'Filme de produto — o objeto em movimento, com acabamento publicitário',
      'Explodida técnica — montagem, componentes e funcionamento interno',
      'Vinheta e abertura — assinatura em movimento para a marca',
      'Motion e finalização — trilha, sonoplastia e entrega por canal',
      'Reaproveitamento — a mesma cena vira imagem parada e nova peça depois',
    ],
    ogImage: '/images/og/tenka-studios.jpg',
    faq: [
      {
        question: 'Animação 3D ou filmagem?',
        answer:
          'Filmagem ganha quando o produto existe, o ambiente é fotogênico e a verdade documental importa. A animação ganha quando é preciso mostrar o que não dá para filmar: o interior de um equipamento, um processo microscópico, uma escala impossível, ou um produto que ainda está no projeto.',
      },
      {
        question: 'Quanto tempo leva uma animação 3D?',
        answer:
          'O que define o prazo é a duração e a complexidade da cena, não só os segundos finais. Um filme de produto curto com uma cena controlada é bem mais rápido que trinta segundos com múltiplos ambientes. O storyboard aprovado é o que trava o prazo — mudança de roteiro depois dele refaz etapas inteiras.',
      },
      {
        question: 'Vocês fazem a trilha e a locução?',
        answer:
          'Coordenamos a finalização completa, incluindo trilha, sonoplastia e locução por profissionais parceiros. A música usada é sempre licenciada — não entregamos peça com trilha sem licença, porque o problema aparece depois, na veiculação.',
      },
      {
        question: 'A animação serve para feira e para redes ao mesmo tempo?',
        answer:
          'Serve, com recortes diferentes. A mesma produção rende a versão longa para o stand e os cortes verticais para redes. Planejar isso desde o storyboard custa quase nada; adaptar depois, com o projeto fechado, custa uma nova finalização.',
      },
    ],
    priority: 0.8,
    changefreq: 'monthly',
  },
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
      'Criação de identidade visual, branding e logotipo: posicionamento, símbolo, paleta, tipografia e manual de aplicação para a marca funcionar na prática.',
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
    path: '/tech/aplicativos',
    title: 'Desenvolvimento de aplicativos iOS e Android | TENKA Tech',
    description:
      'Desenvolvimento de aplicativos para iOS e Android: do protótipo à publicação nas lojas, com back-end, notificações, pagamentos e integrações. São Paulo.',
    h1: 'Desenvolvimento de aplicativos para iOS e Android',
    intro:
      'Aplicativos úteis e consistentes, conectados ao mesmo ecossistema do seu produto. Do protótipo navegável à publicação nas lojas — incluindo o back-end, as integrações e a operação que o app precisa para funcionar de verdade.',
    highlights: [
      'iOS e Android a partir de uma base só, quando o caso permite',
      'Back-end, API e autenticação — o app raramente é só a tela',
      'Notificações, pagamentos e integrações com o que a empresa já usa',
      'Publicação nas lojas, com o processo de revisão conduzido',
      'Operação pós-lançamento — monitoramento, correção e evolução',
    ],
    ogImage: '/images/og/tenka-tech.jpg',
    faq: [
      {
        question: 'Preciso mesmo de um aplicativo?',
        answer:
          'Com frequência, não. Se o uso é esporádico ou vem de campanha, um site rápido converte mais, porque não exige instalação. App compensa quando há uso recorrente, necessidade de funcionar offline, notificação como parte do produto, ou acesso a recursos do aparelho. Dizemos isso antes de orçar.',
      },
      {
        question: 'Nativo ou multiplataforma?',
        answer:
          'Multiplataforma cobre bem a maioria dos aplicativos de negócio e reduz custo e prazo mantendo uma base de código. Nativo compensa quando há exigência pesada de performance gráfica, integração profunda com o sistema ou uso intensivo de hardware. A decisão sai dos requisitos, não da preferência.',
      },
      {
        question: 'As contas das lojas ficam com quem?',
        answer:
          'Com o cliente. Conduzimos a publicação, mas a conta de desenvolvedor Apple e Google, o código e a infraestrutura ficam no nome de quem contratou.',
      },
      {
        question: 'E depois de publicado?',
        answer:
          'App publicado é começo de operação, não fim de projeto: as lojas mudam requisitos, os sistemas operacionais atualizam e o uso real revela o que o teste não revelou. Oferecemos acompanhamento mensal, ou a entrega documentada para seguir com equipe própria.',
      },
    ],
    priority: 0.75,
    changefreq: 'monthly',
  },
  {
    path: '/tech/sites',
    title: 'Criação de sites rápidos e que convertem | TENKA Tech',
    description:
      'Criação de sites institucionais, landing pages e portais com performance, SEO técnico e CMS para o time editar — feitos para converter, não só existir.',
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
      {
        to: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
        label: 'NR-35 — trabalho em altura',
      },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-33-espaco-confinado',
        label: 'NR-33 — espaço confinado',
      },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-10-seguranca-em-eletricidade',
        label: 'NR-10 — segurança em eletricidade',
      },
      { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca em VR' },
      { to: '/tech/sistemas-sob-medida', label: 'Painel de acompanhamento sob medida' },
    ],
    ctaLabel: 'Falar sobre um treinamento em VR',
  },
  {
    path: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
    parent: '/games/treinamento-em-realidade-virtual',
    parentLabel: 'Treinamento em VR',
    accent: GAMES_ACCENT,
    problem: {
      title: 'Ninguém aprende altura no chão',
      body: 'A parte teórica da NR-35 ensina o procedimento. O que ela não consegue ensinar é o que acontece com o corpo e com o julgamento a vinte metros do solo — e é exatamente aí que o trabalhador decide se ancora no ponto certo, se confere o talabarte, se para quando deveria parar. Montar essa prática de verdade exige estrutura, bloqueio de área e exposição real. É caro, é lento, e por isso muita empresa simplesmente não faz.',
    },
    includes: [
      {
        title: 'O seu ambiente, não um genérico',
        description:
          'Telhado, torre, plataforma, silo ou fachada reconstruídos a partir da instalação real da empresa, com os pontos de ancoragem que existem lá.',
      },
      {
        title: 'Altura percebida de verdade',
        description:
          'A sensação de exposição em VR é o que nenhum slide reproduz — e é ela que faz o treinando levar o procedimento a sério.',
      },
      {
        title: 'Queda com consequência',
        description:
          'Ancoragem errada resulta em queda simulada. É a lição que o treinamento tradicional só consegue descrever.',
      },
      {
        title: 'Inspeção de EPI',
        description:
          'Cinto, talabarte e trava-quedas inspecionados no cenário, com defeitos plantados que o trabalhador precisa encontrar.',
      },
      {
        title: 'Registro por trabalhador',
        description:
          'O que cada um fez, em que ordem e onde falhou — material objetivo para o SESMT decidir quem repete.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Levantamento',
        description:
          'Visita à operação com o seu profissional de segurança: tarefas em altura, pontos de ancoragem e o que mais gera incidente.',
      },
      {
        step: '02',
        title: 'Roteiro técnico',
        description:
          'O cenário e os critérios de avaliação definidos junto do SESMT, alinhados ao conteúdo programático da norma.',
      },
      {
        step: '03',
        title: 'Produção',
        description:
          'Construção do ambiente, da interação e da avaliação, com teste em headset desde cedo.',
      },
      {
        step: '04',
        title: 'Turma-piloto',
        description:
          'Aplicação presencial com uma turma real, ajuste do cenário e passagem para os instrutores da empresa.',
      },
    ],
    regulation: {
      code: 'NR-35 — Trabalho em Altura',
      scope:
        'Toda atividade executada acima de 2,00 m do nível inferior onde haja risco de queda.',
      requirements: [
        { label: 'Capacitação inicial', value: 'Mínimo de 8 horas, teórica e prática' },
        { label: 'Capacitação periódica', value: 'Bienal, mínimo de 8 horas' },
        { label: 'Modalidade', value: 'Integralmente presencial — EAD e híbrido vedados' },
        {
          label: 'Responsável',
          value:
            'Instrutor com proficiência comprovada, sob responsabilidade de profissional qualificado em segurança do trabalho',
        },
      ],
      update: {
        title: 'Portaria MTE nº 1.259/2026 — o que mudou',
        body: 'Publicada no Diário Oficial da União em 16 de julho de 2026, a portaria passou a exigir que todos os treinamentos da NR-35 — inicial, periódico e eventual — sejam realizados integralmente na modalidade presencial. Encerrou-se a prática de cumprir a carga horária teórica em EAD autoinstrucional, em formato híbrido ou por transmissão ao vivo. As empresas têm até 16 de julho de 2027 para refazer integralmente, ou complementar presencialmente, a capacitação de quem foi treinado a distância. Na prática, isso elimina o modelo de quem vendia NR-35 100% online e valoriza quem tem como entregar prática presencial de qualidade — que é onde o simulador entra.',
      },
      disclaimer:
        'A TENKA produz o simulador e o relatório de desempenho. Não somos escola de segurança do trabalho e não emitimos certificado de NR. A capacitação, a carga horária, o conteúdo programático, o instrutor e a documentação permanecem sob responsabilidade da empresa e do seu profissional qualificado em segurança do trabalho. O simulador é recurso prático dentro do treinamento presencial, não substituto dele.',
      checkedAt: 'outubro de 2026',
    },
    related: [
      {
        to: '/games/treinamento-em-realidade-virtual/nr-33-espaco-confinado',
        label: 'NR-33 — espaço confinado',
      },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-10-seguranca-em-eletricidade',
        label: 'NR-10 — segurança em eletricidade',
      },
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
    ],
    ctaLabel: 'Falar sobre um simulador de NR-35',
  },
  {
    path: '/games/treinamento-em-realidade-virtual/nr-33-espaco-confinado',
    parent: '/games/treinamento-em-realidade-virtual',
    parentLabel: 'Treinamento em VR',
    accent: GAMES_ACCENT,
    problem: {
      title: 'O treinamento que não dá para ensaiar de verdade',
      body: 'Para treinar espaço confinado na prática, seria preciso um espaço confinado parado, uma atmosfera controlada e alguém disposto a errar lá dentro. Como nada disso é razoável, a prática vira demonstração: o grupo olha o equipamento, o instrutor explica a sequência e todo mundo assina a lista. O trabalhador sai sabendo a ordem dos passos — mas nunca executou a ordem dos passos.',
    },
    includes: [
      {
        title: 'O espaço da sua operação',
        description:
          'Tanque, silo, galeria, vaso ou caixa reconstruídos com a geometria e os acessos reais, não um cilindro genérico.',
      },
      {
        title: 'Atmosfera que se comporta',
        description:
          'Oxigênio, gases inflamáveis e tóxicos variando conforme o que o trabalhador faz — ventilar, abrir, esperar ou entrar cedo demais.',
      },
      {
        title: 'Permissão de entrada na prática',
        description:
          'Preenchimento, bloqueio de energias e checagem feitos como etapa do cenário, não como formulário na mesa.',
      },
      {
        title: 'Cenário próprio do vigia',
        description:
          'A função mais negligenciada do treinamento, treinada da posição de quem fica fora e precisa agir quando algo acontece.',
      },
      {
        title: 'Emergência e resgate',
        description:
          'A situação que ninguém consegue ensaiar de verdade — inclusive o impulso de entrar para socorrer, que é o que mata o segundo trabalhador.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Levantamento',
        description:
          'Mapeamento dos espaços confinados da operação e dos riscos atmosféricos de cada um, com o SESMT.',
      },
      {
        step: '02',
        title: 'Roteiro técnico',
        description:
          'Cenários por função — trabalhador autorizado, vigia e supervisor — e critérios de avaliação.',
      },
      {
        step: '03',
        title: 'Produção',
        description:
          'Ambiente, simulação de atmosfera, interações e avaliação construídos e testados em headset.',
      },
      {
        step: '04',
        title: 'Turma-piloto',
        description: 'Aplicação presencial, ajuste e passagem para os instrutores da empresa.',
      },
    ],
    regulation: {
      code: 'NR-33 — Segurança e Saúde nos Trabalhos em Espaços Confinados',
      scope:
        'Trabalhadores autorizados, vigias e supervisores de entrada em espaços confinados.',
      requirements: [
        {
          label: 'Trabalhador autorizado e vigia',
          value: 'Capacitação inicial de no mínimo 16 horas',
        },
        { label: 'Supervisor de entrada', value: 'Capacitação inicial de no mínimo 40 horas' },
        { label: 'Capacitação periódica', value: 'Anual (12 meses), mínimo de 8 horas' },
        {
          label: 'Modalidade',
          value:
            'Teoria admite EAD nos termos do Anexo II da NR-1; parte prática exige realização presencial',
        },
      ],
      disclaimer:
        'A TENKA produz o simulador e o relatório de desempenho. Não somos escola de segurança do trabalho e não emitimos certificado de NR. A capacitação, a carga horária, o conteúdo programático, o instrutor e a documentação permanecem sob responsabilidade da empresa e do seu profissional qualificado em segurança do trabalho.',
      checkedAt: 'outubro de 2026',
    },
    related: [
      {
        to: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
        label: 'NR-35 — trabalho em altura',
      },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-10-seguranca-em-eletricidade',
        label: 'NR-10 — segurança em eletricidade',
      },
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
    ],
    ctaLabel: 'Falar sobre um simulador de NR-33',
  },
  {
    path: '/games/treinamento-em-realidade-virtual/nr-10-seguranca-em-eletricidade',
    parent: '/games/treinamento-em-realidade-virtual',
    parentLabel: 'Treinamento em VR',
    accent: GAMES_ACCENT,
    problem: {
      title: 'A prática que não pode ser praticada',
      body: 'Em eletricidade, o treinamento prático esbarra num paradoxo: o procedimento existe justamente para que ninguém chegue perto do circuito energizado, e treinar com ele energizado seria violar o que se está ensinando. O resultado é que a sequência de bloqueio, medição e liberação quase sempre é explicada e quase nunca é executada antes do dia em que precisa dar certo.',
    },
    includes: [
      {
        title: 'A sua instalação',
        description:
          'Painéis, quadros, cabines e subestações reconstruídos com a identificação e o layout reais da empresa.',
      },
      {
        title: 'Bloqueio e etiquetagem passo a passo',
        description:
          'A sequência executada na ordem, com o cenário recusando o avanço quando uma etapa foi pulada.',
      },
      {
        title: 'Arco elétrico com consequência',
        description:
          'A manobra errada produz o evento, com efeito visual e sonoro. É a única forma segura de mostrar o que está em jogo.',
      },
      {
        title: 'Medição e liberação',
        description:
          'Teste de ausência de tensão, aterramento temporário e liberação para o trabalho, como etapas avaliadas.',
      },
      {
        title: 'Desempenho por etapa',
        description:
          'Onde cada eletricista errou no procedimento — e qual passo o time inteiro está pulando.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Levantamento',
        description:
          'Instalações, procedimentos de trabalho e os pontos em que a equipe mais se desvia do padrão.',
      },
      {
        step: '02',
        title: 'Roteiro técnico',
        description:
          'Cenários e critérios definidos com o profissional habilitado responsável pelas instalações.',
      },
      {
        step: '03',
        title: 'Produção',
        description: 'Ambiente, interação e avaliação construídos e validados em headset.',
      },
      {
        step: '04',
        title: 'Turma-piloto',
        description: 'Aplicação presencial supervisionada, ajuste e passagem para os instrutores.',
      },
    ],
    regulation: {
      code: 'NR-10 — Segurança em Instalações e Serviços em Eletricidade',
      scope:
        'Trabalhadores que interajam em instalações elétricas energizadas ou em suas proximidades.',
      requirements: [
        { label: 'Curso básico', value: 'Mínimo de 40 horas' },
        {
          label: 'Complementar SEP',
          value: 'Mínimo de 40 horas, com o curso básico como pré-requisito',
        },
        {
          label: 'Reciclagem',
          value:
            'Bienal; também em troca de função ou empresa, retorno de afastamento superior a 3 meses e mudança de método ou processo de trabalho',
        },
        {
          label: 'Modalidade',
          value: 'Conteúdo prático em modalidade presencial, com supervisão',
        },
      ],
      update: {
        title: 'Portaria MTE nº 737/2026 — o que muda',
        body: 'A portaria reestrutura a NR-10 e estabelece vacância geral de um ano a partir da publicação, com prazo adicional para um subitem específico. Entre os pontos de maior impacto: o conteúdo prático passa a ser expressamente presencial e supervisionado, considerando a realidade da organização, as características da instalação e os procedimentos de trabalho; e a validade do treinamento fica restrita à organização que o forneceu, sem revalidação ou convalidação de certificado entre empresas. O efeito prático é o enfraquecimento do certificado genérico de prateleira e o fortalecimento do treinamento construído sobre a instalação real da empresa.',
      },
      disclaimer:
        'A TENKA produz o simulador e o relatório de desempenho. Não somos escola de segurança do trabalho e não emitimos certificado de NR. A capacitação, a carga horária, o conteúdo programático, o instrutor e a documentação permanecem sob responsabilidade da empresa e do seu profissional habilitado e do profissional qualificado em segurança do trabalho.',
      checkedAt: 'outubro de 2026',
    },
    related: [
      {
        to: '/games/treinamento-em-realidade-virtual/nr-35-trabalho-em-altura',
        label: 'NR-35 — trabalho em altura',
      },
      {
        to: '/games/treinamento-em-realidade-virtual/nr-33-espaco-confinado',
        label: 'NR-33 — espaço confinado',
      },
      { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em VR' },
    ],
    ctaLabel: 'Falar sobre um simulador de NR-10',
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
    path: '/games/jogos-mobile',
    parent: '/games',
    parentLabel: 'TENKA Games',
    accent: GAMES_ACCENT,
    problem: {
      title: 'O jogo que ninguém abre uma segunda vez',
      body: 'A maior parte dos jogos mobile morre não por falta de arte, mas por uma mecânica central que não sustenta o retorno. Isso aparece tarde quando a produção começa pela estética e deixa o teste para o fim. Começar pelo protótipo cru inverte o risco: se a mecânica não prende em cinza, nenhuma quantidade de polimento resolve.',
    },
    includes: [
      {
        title: 'Protótipo da mecânica primeiro',
        description:
          'Um trecho jogável, sem arte final, testado com gente de verdade. É a etapa mais barata para descobrir que a ideia não funciona.',
      },
      {
        title: 'Produção completa',
        description:
          'Arte, código, áudio e interface avançando como um sistema só, com performance calibrada para o aparelho-alvo.',
      },
      {
        title: 'Publicação conduzida',
        description:
          'App Store e Google Play, incluindo fichas, classificação indicativa e o processo de revisão — nas contas do cliente.',
      },
      {
        title: 'Economia do jogo',
        description:
          'Quando o modelo pede monetização, ela é desenhada junto com a mecânica, não colada depois.',
      },
      {
        title: 'Evolução com dados',
        description:
          'Onde o jogador para, onde desiste e onde volta — para a próxima versão ser decidida por uso real.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Imersão',
        description: 'Objetivo, público, referência e o que define sucesso para este jogo.',
      },
      {
        step: '02',
        title: 'Protótipo',
        description: 'A mecânica central jogável, testada antes de escalar a produção.',
      },
      {
        step: '03',
        title: 'Construção',
        description: 'Arte, código, áudio e interação, com otimização contínua no aparelho real.',
      },
      {
        step: '04',
        title: 'Publicação',
        description: 'Lojas, acompanhamento do lançamento e primeira rodada de ajustes.',
      },
    ],
    related: [
      { to: '/games/jogos-de-navegador', label: 'Jogos de navegador' },
      { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' },
      { to: '/tech/aplicativos', label: 'Aplicativos iOS e Android' },
    ],
    ctaLabel: 'Falar sobre um jogo mobile',
  },
  {
    path: '/games/jogos-de-navegador',
    parent: '/games',
    parentLabel: 'TENKA Games',
    accent: GAMES_ACCENT,
    problem: {
      title: 'Cada passo a mais derruba a participação pela metade',
      body: 'Em campanha, o funil não morre no jogo — morre antes dele. Pedir instalação, cadastro ou atualização elimina a maior parte das pessoas que teriam jogado. O jogo de navegador existe para tirar esses passos do caminho: o visitante toca no link e já está dentro.',
    },
    includes: [
      {
        title: 'Entrada por link ou QR code',
        description:
          'Sem loja, sem instalação, sem cadastro obrigatório na porta. O cadastro vem depois, quando a pessoa já se interessou.',
      },
      {
        title: 'Projetado para celular',
        description:
          'Aparelho-alvo definido no início. Produzir para desktop e adaptar depois é o que derruba a taxa de conclusão.',
      },
      {
        title: 'Peso como requisito',
        description:
          'O orçamento de carregamento entra no projeto, porque campanha roda em 4G e em aparelho mediano.',
      },
      {
        title: 'Integração com a campanha',
        description:
          'Site, CRM, mecânica de promoção e origem de tráfego ligados desde o começo.',
      },
      {
        title: 'Ajuste no ar',
        description:
          'Sem aprovação de loja: uma correção entra no mesmo dia, o que importa muito com campanha rodando.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Objetivo',
        description: 'O que a campanha precisa que aconteça, e em quanto tempo.',
      },
      {
        step: '02',
        title: 'Mecânica',
        description: 'Protótipo cru da jogabilidade, testado no celular desde o primeiro dia.',
      },
      {
        step: '03',
        title: 'Produção',
        description: 'Arte, código e integrações, com peso e carregamento medidos a cada entrega.',
      },
      {
        step: '04',
        title: 'No ar',
        description: 'Publicação, acompanhamento durante a campanha e ajustes com dado real.',
      },
    ],
    related: [
      { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' },
      { to: '/games/jogos-mobile', label: 'Jogos mobile' },
      { to: '/tech/sites', label: 'Landing page da campanha' },
    ],
    ctaLabel: 'Falar sobre um jogo de navegador',
  },
  {
    path: '/studios/animacao-3d',
    parent: '/studios',
    parentLabel: 'TENKA Studios',
    accent: STUDIOS_ACCENT,
    problem: {
      title: 'O que a câmera não alcança',
      body: 'Tem coisa que filmagem não resolve: o interior de um equipamento em funcionamento, a montagem de um produto peça por peça, uma escala que não cabe em lente nenhuma, ou um produto que ainda está no projeto. Nesses casos a animação não é alternativa estética à filmagem — é a única forma de mostrar.',
    },
    includes: [
      {
        title: 'Filme de produto',
        description:
          'O objeto em movimento, com luz, material e acabamento de peça publicitária.',
      },
      {
        title: 'Explodida técnica',
        description:
          'Montagem, componentes e funcionamento interno — o argumento de venda que a foto não dá.',
      },
      {
        title: 'Vinheta e abertura',
        description:
          'Assinatura em movimento, construída a partir do sistema visual da marca.',
      },
      {
        title: 'Finalização completa',
        description:
          'Trilha licenciada, sonoplastia e locução, com entrega nos formatos de cada canal.',
      },
      {
        title: 'Cena reaproveitável',
        description:
          'A mesma cena vira imagem parada, corte vertical e a próxima peça — sem recomeçar do zero.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Roteiro',
        description: 'O que a peça precisa provar, em quantos segundos, e para qual canal.',
      },
      {
        step: '02',
        title: 'Storyboard',
        description: 'Aprovação do percurso antes de produzir. É aqui que o prazo trava.',
      },
      {
        step: '03',
        title: 'Produção',
        description: 'Modelagem, animação, materiais e luz, com prévias a cada etapa.',
      },
      {
        step: '04',
        title: 'Finalização',
        description: 'Tratamento, trilha, som e entrega nos cortes de cada canal.',
      },
    ],
    related: [
      { to: '/studios/mockup-3d-de-produto', label: 'Mockup 3D de produto' },
      { to: '/studios/maquete-eletronica-3d', label: 'Maquete eletrônica 3D' },
      { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca em VR' },
    ],
    ctaLabel: 'Falar sobre uma animação 3D',
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
    path: '/tech/aplicativos',
    parent: '/tech',
    parentLabel: 'TENKA Tech',
    accent: TECH_ACCENT,
    problem: {
      title: 'O app que ninguém instala',
      body: 'Muito projeto de aplicativo começa pela conclusão: "precisamos de um app". Aí descobre-se, depois de publicado, que o uso é esporádico e que a instalação era o maior obstáculo entre a empresa e o cliente — um site rápido teria convertido mais, por uma fração do custo. A pergunta certa não é como fazer o app, é se ele precisa existir.',
    },
    includes: [
      {
        title: 'A pergunta antes do projeto',
        description:
          'Se o caso se resolve melhor na web, dizemos isso antes de orçar. Vender um app desnecessário é o jeito mais rápido de perder o cliente seguinte.',
      },
      {
        title: 'Uma base, duas plataformas',
        description:
          'iOS e Android a partir do mesmo código quando os requisitos permitem; nativo quando performance ou hardware exigem.',
      },
      {
        title: 'O que fica atrás da tela',
        description:
          'Back-end, API, autenticação e permissões. O app raramente é só a interface, e é aqui que os projetos encalham.',
      },
      {
        title: 'Notificações, pagamentos e integrações',
        description:
          'Com o que a empresa já usa — e com o tratamento de erro que mantém a operação de pé.',
      },
      {
        title: 'Publicação e operação',
        description:
          'Processo de revisão das lojas conduzido, nas contas do cliente, e acompanhamento depois do lançamento.',
      },
    ],
    process: [
      {
        step: '01',
        title: 'Validar a necessidade',
        description: 'Uso recorrente, offline, notificação ou hardware? Se não houver nenhum, a web resolve.',
      },
      {
        step: '02',
        title: 'Arquitetar',
        description: 'Dados, autenticação, integrações e o que precisa funcionar sem conexão.',
      },
      {
        step: '03',
        title: 'Construir em fatias',
        description: 'Versão utilizável cedo, em build de teste, antes de escalar o escopo.',
      },
      {
        step: '04',
        title: 'Publicar e operar',
        description: 'Lojas, monitoramento e evolução — porque loja e sistema operacional mudam sozinhos.',
      },
    ],
    related: [
      { to: '/tech/sistemas-sob-medida', label: 'Sistema sob medida' },
      { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automação e agentes de IA' },
      { to: '/games/jogos-mobile', label: 'Jogos mobile' },
    ],
    ctaLabel: 'Falar sobre um aplicativo',
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

/**
 * Filhas diretas de uma página — a divisão lista seus serviços, e uma página de
 * serviço lista suas subpáginas (é como /treinamento-em-realidade-virtual chega
 * nas três de NR). Compara o pai exato, então uma neta não vaza para o avô.
 */
export function servicesUnder(parent: string): SeoRoute[] {
  const paths = new Set(
    SERVICE_CONTENT.filter((content) => content.parent === parent).map((c) => c.path),
  );
  return SERVICE_ROUTES.filter((route) => paths.has(route.path));
}
