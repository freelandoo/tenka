import type { Guide } from './types';

/*
 * Regras deste arquivo (o teste em guides.test.ts confere):
 * - resposta direta no `lead`; texto próprio por página (nada copiado entre guias);
 * - nenhuma promessa que a TENKA não controla: posição no Google, prazo fixo,
 *   porcentagem de resultado, "o melhor", "o mais barato";
 * - preço só os públicos: sites 300 / 650 / 1.000, hospedagem 60/mês,
 *   Google Meu Negócio 39,90/mês (99,90/mês junto com a hospedagem do site).
 */

const TECH = '#00B8B3';
const STUDIOS = '#D9232E';
const GAMES = '#FF6A0A';

const SITE_PRODUCT = { to: '/precos', label: 'Ver os planos de site' };
const STORE = { to: '/loja', label: 'Ver na loja da TENKA' };

export const GUIDES: Guide[] = [
  // ───────────────────────────── SITES ─────────────────────────────
  {
    path: '/guias/sites',
    keyword: 'site profissional para empresa',
    title: 'Site profissional para empresa: guia para decidir | TENKA',
    description: 'O que um site de empresa precisa ter, quanto custa, quando vale landing page ou site completo e quando o 3D compensa — com exemplos reais da TENKA.',
    h1: 'Site profissional para empresa: o guia para decidir',
    lead: 'Um site de empresa precisa fazer três coisas: carregar rápido no celular, aparecer quando alguém procura o seu serviço e levar a pessoa até o contato. O resto — animação, 3D, número de páginas — é escolha de quanto você quer se destacar.',
    blocks: [
      { h2: 'O mínimo que não pode faltar', list: ['Abrir rápido numa conexão 4G comum', 'Título e descrição de cada página escritos para busca', 'Um caminho óbvio até o WhatsApp ou o formulário', 'Endereço, área atendida e serviços claros'] },
      { h2: 'Onde o investimento muda', p: ['Uma landing page resolve quem vende um serviço principal. Várias páginas de serviço ajudam quem quer aparecer em buscas diferentes. Um elemento 3D entra quando o objetivo é ser lembrado — como o ar-condicionado que se monta na rolagem do site da GS Refrigeração.'] },
      { h2: 'Perguntas deste guia', p: ['Quanto custa um site, se é melhor landing page ou site institucional, e se o 3D vale a pena — cada uma tem a sua página logo abaixo.'] },
    ],
    faqs: [
      { q: 'Preciso de site se já tenho Instagram?', a: 'O Instagram mostra o seu trabalho para quem já te segue; o site é o que aparece para quem ainda não te conhece e está procurando no Google.' },
      { q: 'E o domínio?', a: 'O endereço (o .com.br) é registrado à parte; quem fica como titular é combinado no início do projeto.' },
    ],
    links: { product: SITE_PRODUCT, making: { to: '/projetos/gs-refrigeracao', label: 'Como fizemos o site da GS Refrigeração' } },
    works: ['gs', 'hidrovap', 'excelencia', 'rh', 'vivaar'],
    accent: TECH,
  },
  {
    path: '/guias/sites/quanto-custa-um-site',
    keyword: 'quanto custa um site',
    title: 'Quanto custa um site profissional em 2026 | TENKA',
    description: 'Na TENKA, landing page sai de R$ 300 a R$ 1.000 conforme o nível de animação e 3D, mais R$ 60 por mês de hospedagem. Veja o que muda de um plano para o outro.',
    h1: 'Quanto custa um site profissional',
    lead: 'Na TENKA, uma landing page custa R$ 300 (Essencial), R$ 650 (Premium, com animações) ou R$ 1.000 (Experiência, com elemento 3D), mais R$ 60 por mês de hospedagem. Sistemas, lojas e áreas de membro são orçados à parte.',
    blocks: [
      { h2: 'O que faz o preço subir', list: ['Quantidade de páginas diferentes', 'Animação e interação na tela', 'Modelagem 3D própria do seu produto', 'Integrações: pagamento, agenda, área do cliente'] },
      { h2: 'O que a mensalidade cobre', p: ['Os R$ 60 por mês mantêm o site no ar 24 horas, com o certificado de segurança e a estrutura de cada página preparada para a busca orgânica. Com o acompanhamento do Google Meu Negócio junto, a mensalidade fica R$ 99,90.'] },
      { h2: 'Quando o preço de tabela não serve', p: ['Se o projeto precisa de login, pagamento dentro do site ou integração com outro sistema, ele deixa de ser landing page — vira sistema e é orçado depois de uma conversa sobre o que precisa funcionar.'] },
    ],
    faqs: [
      { q: 'O que está incluído em cada valor?', a: 'O valor do plano é a criação do site; a mensalidade é a hospedagem. O registro do domínio é à parte.' },
      { q: 'Posso começar no Essencial e mudar depois?', a: 'Pode, e o endereço continua o mesmo; a troca de plano é orçada como uma nova etapa do projeto.' },
    ],
    links: { product: SITE_PRODUCT, making: { to: '/projetos/rh-climatizacao', label: 'Bastidores do site da RH Climatização' } },
    works: ['rh', 'vivaar', 'gs'],
    accent: TECH,
  },
  {
    path: '/guias/sites/landing-page-ou-site-institucional',
    keyword: 'landing page ou site institucional',
    title: 'Landing page ou site institucional: qual escolher | TENKA',
    description: 'Landing page converte uma oferta; site institucional disputa várias buscas. Veja a diferença na prática e quando começar por uma e crescer para a outra.',
    h1: 'Landing page ou site institucional: qual escolher',
    lead: 'Escolha landing page se você vende uma coisa principal e quer que quem chega chame no WhatsApp. Escolha site com várias páginas se as pessoas procuram você por serviços diferentes — cada serviço com página própria tem chance própria no Google.',
    blocks: [
      { h2: 'Landing page, na prática', p: ['Uma página longa, uma oferta, um botão. Funciona muito bem para anúncio e para quem indica você por mensagem: a pessoa abre, entende e chama.'] },
      { h2: 'Site institucional, na prática', p: ['Uma página por serviço, por problema que o cliente tem e por dúvida comum. A Hidrovap, por exemplo, tem 25 páginas: seis serviços e dezoito dúvidas que os vizinhos dela no Google quase não respondem.'] },
      { h2: 'Dá para começar pequeno', p: ['O caminho mais comum é começar pela landing page e acrescentar páginas de serviço quando a empresa quer aparecer em mais buscas — sem trocar de endereço.'] },
    ],
    faqs: [
      { q: 'Landing page aparece no Google?', a: 'Aparece, mas disputa poucas buscas: uma página só fala de poucos assuntos com profundidade.' },
      { q: 'Quantas páginas um site de serviço precisa?', a: 'Uma por serviço que você quer vender, mais páginas para as dúvidas reais dos clientes. Página parecida com outra não ajuda.' },
    ],
    links: { product: SITE_PRODUCT, making: { to: '/projetos/hidrovap', label: 'Como fizemos as 25 páginas da Hidrovap' } },
    works: ['hidrovap', 'gs', 'excelencia'],
    accent: TECH,
  },
  {
    path: '/guias/sites/site-com-3d-vale-a-pena',
    keyword: 'site com 3D',
    title: 'Site com 3D vale a pena? Quando sim e quando não | TENKA',
    description: 'Um site 3D marca quem visita, mas só compensa se carregar rápido no celular e não esconder o contato. Veja como fazer 3D leve e quando ele não é a resposta.',
    h1: 'Site com 3D vale a pena?',
    lead: 'Vale quando o 3D conta o seu serviço — o aparelho que se monta, o cano por dentro, o freezer que abre — e quando ele carrega leve no celular. Não vale como enfeite que atrasa a página ou que esconde o botão de contato.',
    blocks: [
      { h2: 'O que faz o 3D funcionar', list: ['Ser o próprio produto ou serviço, não um objeto aleatório', 'Níveis de qualidade diferentes para cada aparelho', 'Uma imagem de reserva para quem não tem 3D', 'Texto e botão de contato sempre por cima da cena'] },
      { h2: 'Três exemplos reais', p: ['Na GS, um ar-condicionado de 13 peças se monta enquanto a pessoa rola. Na Hidrovap, a câmera viaja dentro do cano. Na Excelência, um freezer se desmonta para mostrar o que o técnico conhece por dentro.'] },
      { h2: 'Quando não usar', p: ['Se o seu cliente quer só o telefone e o endereço, um site rápido e direto converte mais. O 3D é para quem precisa ser lembrado entre vários concorrentes parecidos.'] },
    ],
    faqs: [
      { q: 'O 3D deixa o site pesado?', a: 'Pode deixar, se mal feito. Os nossos medem o aparelho e reduzem a cena em celular fraco; sem suporte, mostram uma imagem no lugar.' },
      { q: 'Preciso ter um modelo 3D pronto?', a: 'Não. O modelo é feito a partir de fotos, vídeo ou da vista explodida do seu produto.' },
    ],
    links: { product: SITE_PRODUCT, making: { to: '/projetos/excelencia-refrigeracao', label: 'O freezer 3D da Excelência por dentro' } },
    works: ['excelencia', 'gs', 'hidrovap'],
    accent: TECH,
  },

  // ───────────────────────────── GOOGLE ─────────────────────────────
  {
    path: '/guias/google',
    keyword: 'como aparecer no google',
    title: 'Aparecer no Google: guia para empresa local | TENKA',
    description: 'Perfil da Empresa, site com páginas de serviço e medição pelo Search Console e Analytics: o que cada peça faz para uma empresa local ser encontrada no Google.',
    h1: 'Aparecer no Google: o guia para empresa local',
    lead: 'Empresa local aparece no Google por dois caminhos: o Perfil da Empresa (o antigo Google Meu Negócio), que mostra você no mapa, e o site, que responde às buscas por serviço. O Search Console e o Analytics mostram se está funcionando.',
    blocks: [
      { h2: 'As três peças', list: ['Perfil da Empresa: mapa, avaliações, fotos, horário', 'Site: uma página para cada serviço e dúvida', 'Search Console e Analytics: o que as pessoas buscam e de onde vêm'] },
      { h2: 'O que ninguém controla', p: ['Nenhuma agência escolhe a sua posição no Google. O que dá para fazer é deixar o perfil completo e ativo, o site claro e rápido, e acompanhar os números todo mês para corrigir o rumo.'] },
    ],
    faqs: [
      { q: 'Em quanto tempo começo a aparecer?', a: 'Depende da concorrência da sua região e de quanto o perfil e o site estão completos; o acompanhamento mensal mostra a evolução com números reais.' },
      { q: 'Preciso pagar anúncio?', a: 'Não para aparecer na busca orgânica e no mapa. Anúncio é outro canal, pago por clique.' },
    ],
    links: { product: STORE, making: { to: '/projetos/hidrovap', label: 'Como a Hidrovap foi preparada para a busca local' } },
    works: ['hidrovap', 'rh', 'vivaar'],
    accent: TECH,
  },
  {
    path: '/guias/google/como-aparecer-no-google',
    keyword: 'como aparecer no google',
    title: 'Como fazer minha empresa aparecer no Google | TENKA',
    description: 'Passo a passo honesto para aparecer no Google: perfil completo, avaliações respondidas, site com página por serviço e os números acompanhados todo mês.',
    h1: 'Como fazer minha empresa aparecer no Google',
    lead: 'Comece pelo Perfil da Empresa completo, com categoria certa, fotos reais e avaliações respondidas. Depois, um site com uma página por serviço. Por fim, acompanhe no Search Console quais buscas trazem gente — e escreva para elas.',
    blocks: [
      { h2: 'Passo 1 — o perfil', list: ['Categoria principal exata do seu serviço', 'Área de atendimento e horário corretos', 'Fotos de trabalhos reais, não de banco de imagem', 'Resposta a toda avaliação, boa ou ruim'] },
      { h2: 'Passo 2 — o site', p: ['Cada serviço com página própria, título que diz o serviço e a cidade, e o telefone fácil de achar. Página repetida trocando só o nome do bairro é tratada como spam.'] },
      { h2: 'Passo 3 — medir', p: ['O Search Console mostra as buscas em que o site apareceu e quantas vezes alguém clicou. É esse número que diz qual página escrever em seguida.'] },
    ],
    faqs: [
      { q: 'Posso criar uma página para cada bairro?', a: 'Só se você tiver atendimento e conteúdo de verdade em cada um. Páginas quase iguais por região são consideradas abuso pelo Google.' },
      { q: 'Avaliação ruim atrapalha?', a: 'Atrapalha mais sem resposta. Uma resposta educada e objetiva mostra para quem lê que a empresa resolve.' },
    ],
    links: { product: STORE, making: { to: '/projetos/gs-refrigeracao', label: 'As 22 páginas de SEO da GS' } },
    works: ['gs', 'hidrovap', 'rh'],
    accent: TECH,
  },
  {
    path: '/guias/google/google-meu-negocio-como-funciona',
    keyword: 'google meu negócio',
    title: 'Google Meu Negócio: como funciona o Perfil da Empresa | TENKA',
    description: 'O Google Meu Negócio virou Perfil da Empresa no Google. Entenda o que ele mostra, como ele ajuda a empresa a aparecer no mapa e o que precisa ser feito todo mês.',
    h1: 'Google Meu Negócio: como funciona o Perfil da Empresa',
    lead: 'O Google Meu Negócio hoje se chama Perfil da Empresa no Google. É a ficha que aparece no mapa e ao lado da busca, com telefone, rota, horário, fotos e avaliações — gratuita, mas que só trabalha a seu favor se for mantida ativa.',
    blocks: [
      { h2: 'O que a ficha mostra', list: ['Telefone, site e botão de rota', 'Horário e área atendida', 'Fotos e publicações', 'Avaliações e as suas respostas'] },
      { h2: 'O trabalho de todo mês', p: ['Publicar fotos novas de trabalhos, responder avaliações, conferir horário e serviços, e olhar o relatório: quantas pessoas viram o perfil, ligaram, pediram rota ou abriram o site.'] },
    ],
    faqs: [
      { q: 'O perfil é pago?', a: 'O perfil é gratuito. O que se paga, quando se terceiriza, é o trabalho de mantê-lo ativo e acompanhar os números.' },
      { q: 'Preciso de endereço físico?', a: 'Não necessariamente: empresa que atende na casa do cliente pode mostrar só a área de atendimento.' },
    ],
    links: { product: STORE, making: { to: '/projetos/rh-climatizacao', label: 'Bastidores do site da RH Climatização' } },
    works: ['rh', 'vivaar', 'hidrovap'],
    accent: TECH,
  },
  {
    path: '/guias/google/quanto-custa-gerenciar-o-google-meu-negocio',
    keyword: 'quanto custa gerenciar google meu negócio',
    title: 'Quanto custa gerenciar o Google Meu Negócio | TENKA',
    description: 'Na TENKA o acompanhamento do Perfil da Empresa custa R$ 39,90 por mês, com relatório, publicações e resposta a avaliações; junto com a hospedagem do site, R$ 99,90.',
    h1: 'Quanto custa gerenciar o Google Meu Negócio',
    lead: 'Na TENKA, o acompanhamento do Perfil da Empresa custa R$ 39,90 por mês. Para quem tem o site com a gente, hospedagem e acompanhamento juntos ficam R$ 99,90 por mês.',
    blocks: [
      { h2: 'O que entra no acompanhamento', list: ['Relatório mensal na área do cliente', 'Publicações e fotos no perfil', 'Resposta às avaliações', 'Conferência de horário, serviços e área'] },
      { h2: 'O que não entra', p: ['Anúncio pago e promessa de posição. O acompanhamento cuida do que está ao alcance — perfil completo, ativo e medido — e mostra a evolução com os números do próprio Google.'] },
    ],
    faqs: [
      { q: 'É assinatura?', a: 'É uma assinatura mensal, contratada pela loja da TENKA; as condições aparecem antes do pagamento.' },
      { q: 'E se eu ainda não tiver o perfil?', a: 'A configuração inicial do perfil é combinada antes de começar o acompanhamento.' },
    ],
    links: { product: STORE, making: { to: '/projetos/vivaar-climatizacao', label: 'Bastidores do site da VivaAr' } },
    works: ['vivaar', 'rh', 'gs'],
    accent: TECH,
  },
  {
    path: '/guias/google/search-console-e-analytics',
    keyword: 'search console e analytics',
    title: 'Search Console e Analytics: para que servem | TENKA',
    description: 'Search Console mostra como o Google vê o seu site; Analytics mostra o que as pessoas fazem nele. Veja o que olhar em cada um e como os números viram decisão.',
    h1: 'Search Console e Analytics: para que servem',
    lead: 'O Search Console mostra o lado do Google: em quais buscas o site apareceu, em que posição e quantos clicaram. O Analytics mostra o lado da pessoa: de onde veio, que página abriu e se chegou ao contato. Um sem o outro conta metade da história.',
    blocks: [
      { h2: 'O que olhar no Search Console', list: ['Buscas com muitas aparições e poucos cliques — título a melhorar', 'Páginas que não foram indexadas', 'Erros de celular e de velocidade'] },
      { h2: 'O que olhar no Analytics', list: ['Origem das visitas: busca, redes, direto', 'Página de entrada mais comum', 'Cliques no WhatsApp e no telefone'] },
      { h2: 'Cuidado com visita falsa', p: ['Quando um site é embutido dentro de outro, cada exibição pode contar como visita. Por isso a vitrine da TENKA mostra os sites dos clientes em vídeo, e não embutidos — os números deles ficam limpos.'] },
    ],
    faqs: [
      { q: 'Preciso dos dois?', a: 'Sim: um diz como você é encontrado, o outro o que acontece depois.' },
      { q: 'Preciso criar as contas?', a: 'As duas ferramentas são gratuitas do Google e ligadas ao site; a configuração faz parte do acompanhamento.' },
    ],
    links: { product: STORE, making: { to: '/projetos/gs-refrigeracao', label: 'Como medimos o site da GS' } },
    works: ['gs', 'freelandoo', 'hidrovap'],
    accent: TECH,
  },

  // ───────────────────────────── GAMES ─────────────────────────────
  {
    path: '/guias/games',
    keyword: 'jogo para empresa',
    title: 'Jogos para marcas e eventos: guia | TENKA',
    description: 'Advergame, jogo de evento com ranking, jogo no navegador ou aplicativo: o que cada formato entrega para uma marca, com os jogos que a TENKA já colocou no ar.',
    h1: 'Jogos para marcas e eventos: o guia',
    lead: 'Um jogo de marca funciona quando o produto vira mecânica — o pote que dá poder, a embalagem que abre a fase — e quando a pessoa joga sem instalar nada. É por isso que a maior parte dos jogos de campanha roda no navegador do celular.',
    blocks: [
      { h2: 'Os formatos mais comuns', list: ['Advergame: o jogo é a campanha', 'Jogo de evento: ranking ao vivo e prêmio', 'Jogo de comunidade: o público volta todo dia', 'Treinamento gamificado: aprender jogando'] },
      { h2: 'O que a TENKA já colocou no ar', p: ['O Astronaut Jetpack, jogo da Innovation Week aberto pelo QR da embalagem; o Meu Mundo, mundo 3D multiplayer dentro de uma comunidade; e o EVO Brazil, jogo de criação e luta de criaturas.'] },
    ],
    faqs: [
      { q: 'Jogo de marca precisa de aplicativo?', a: 'Na maioria dos casos não: no navegador a pessoa joga em segundos, a partir de um link ou QR.' },
      { q: 'Dá para medir o resultado?', a: 'Dá: partidas, tempo de jogo, ranking e quantas pessoas chegaram pelo QR.' },
    ],
    links: { product: { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' }, making: { to: '/projetos/astronaut-jetpack', label: 'Como fizemos o Astronaut Jetpack' } },
    works: ['astronaut', 'mm-jetpack', 'evo', 'mm-dominios'],
    accent: GAMES,
  },
  {
    path: '/guias/games/o-que-e-advergame',
    keyword: 'o que é advergame',
    title: 'O que é advergame e quando usar na campanha | TENKA',
    description: 'Advergame é um jogo feito para uma marca, em que o produto faz parte da mecânica. Veja quando ele funciona, como medir e um exemplo real aberto pelo QR da embalagem.',
    h1: 'O que é advergame',
    lead: 'Advergame é um jogo criado para uma marca, em que o produto faz parte da mecânica — e não aparece só num banner. No Astronaut Jetpack, pegar o pote do produto dá cinco segundos voando duas vezes mais rápido.',
    blocks: [
      { h2: 'Quando ele funciona', list: ['O produto tem um "poder" que dá para transformar em regra do jogo', 'Existe um ponto de entrada fácil: QR, link, anúncio', 'A partida é curta e dá vontade de jogar de novo'] },
      { h2: 'Como medir', p: ['Partidas jogadas, tempo por partida, quantas pessoas voltaram e quantas chegaram pelo QR da embalagem. Com ranking, dá para premiar e transformar o jogo em ação de evento.'] },
    ],
    faqs: [
      { q: 'Advergame é caro?', a: 'Depende do tamanho do jogo. Um jogo de partida curta, com uma mecânica e um ranking, é bem menor que um jogo de várias fases.' },
      { q: 'Funciona fora de evento?', a: 'Sim: o mesmo jogo pode ficar no ar como parte da campanha, aberto pelo QR ou por link.' },
    ],
    links: { product: { to: '/games/advergame-e-gamificacao', label: 'Advergame e gamificação' }, making: { to: '/projetos/astronaut-jetpack', label: 'Bastidores do Astronaut Jetpack' } },
    works: ['astronaut', 'innovation', 'mm-jetpack'],
    accent: GAMES,
  },
  {
    path: '/guias/games/jogo-para-evento-com-ranking',
    keyword: 'jogo para evento com ranking',
    title: 'Jogo para evento com ranking ao vivo: como funciona | TENKA',
    description: 'Um jogo de evento junta partida curta, ranking ao vivo no telão e prêmio no fim. Veja o que ele precisa ter para funcionar no estande e um exemplo que já rodou.',
    h1: 'Jogo para evento com ranking ao vivo',
    lead: 'Um jogo de evento precisa de partida curta, entrada sem cadastro longo e um ranking que aparece ao vivo no telão. O ranking é o que segura gente no estande: quem joga quer ver o próprio nome subir.',
    blocks: [
      { h2: 'O que não pode faltar', list: ['Partida de um a dois minutos', 'Entrada pelo celular, por QR', 'Telão com o ranking atualizando sozinho', 'Encerramento com pódio e vencedor'] },
      { h2: 'Um exemplo real', p: ['Na Innovation Week, o jogo do astronauta tinha ranking ao vivo e um aviso de fim de evento com os três primeiros e o vencedor em destaque.'] },
    ],
    faqs: [
      { q: 'Precisa de internet no estande?', a: 'Para o ranking ao vivo, sim. A partida em si é leve e roda no celular de quem joga.' },
      { q: 'Dá para usar o mesmo jogo em vários eventos?', a: 'Dá: o ranking é zerado a cada edição e o jogo continua o mesmo.' },
    ],
    links: { product: { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca' }, making: { to: '/projetos/astronaut-jetpack', label: 'Como o ranking do Astronauta foi feito' } },
    works: ['astronaut', 'innovation', 'casaviews'],
    accent: GAMES,
  },
  {
    path: '/guias/games/jogo-no-navegador-ou-aplicativo',
    keyword: 'jogo no navegador ou aplicativo',
    title: 'Jogo no navegador ou aplicativo: qual escolher | TENKA',
    description: 'Jogo no navegador abre por link, sem instalar; aplicativo dá acesso a loja e notificação. Compare os dois para campanha, comunidade e jogo de longa duração.',
    h1: 'Jogo no navegador ou aplicativo: qual escolher',
    lead: 'Para campanha e evento, navegador: a pessoa joga em segundos, por link ou QR. Para jogo que a pessoa vai abrir todo dia, por meses, aplicativo começa a fazer sentido — e dá para ter os dois a partir do mesmo projeto.',
    blocks: [
      { h2: 'Navegador', list: ['Abre por link, sem instalação', 'Atualização chega na hora para todos', 'Ideal para campanha, evento e comunidade'] },
      { h2: 'Aplicativo', list: ['Ícone na tela do celular', 'Notificação para chamar o jogador de volta', 'Publicação nas lojas'] },
      { h2: 'Os dois juntos', p: ['O EVO Brazil é feito em Godot e exporta para o navegador e para Android a partir do mesmo projeto; o Meu Mundo roda no navegador do celular, dentro de uma comunidade.'] },
    ],
    faqs: [
      { q: 'Jogo 3D roda bem no navegador do celular?', a: 'Roda, se for feito com orçamento de desempenho: modelos leves, textura comprimida e qualidade ajustada a cada aparelho.' },
      { q: 'Dá para começar no navegador e lançar app depois?', a: 'Dá, quando a engine exporta para os dois.' },
    ],
    links: { product: { to: '/games/jogos-mobile', label: 'Jogos mobile' }, making: { to: '/projetos/evo-brazil', label: 'Como fazemos o EVO Brazil' } },
    works: ['evo', 'mm-jetpack', 'mm-minijogos'],
    accent: GAMES,
  },

  // ─────────────────────── REALIDADE AUMENTADA / VIRTUAL ───────────────────────
  {
    path: '/guias/realidade-aumentada-e-virtual',
    keyword: 'realidade aumentada para empresas',
    title: 'Realidade aumentada e virtual para empresas | TENKA',
    description: 'Onde realidade aumentada e virtual fazem sentido para uma marca — embalagem, evento e treinamento — e o que separa uma experiência útil de uma moda passageira.',
    h1: 'Realidade aumentada e virtual para empresas',
    lead: 'Realidade aumentada coloca algo digital no mundo real, pela câmera do celular — ideal para embalagem e ponto de venda. Realidade virtual leva a pessoa para outro lugar, com óculos — ideal para treinamento e ativação em evento.',
    blocks: [
      { h2: 'Onde cada uma entra', list: ['Embalagem com QR que abre uma experiência: realidade aumentada', 'Estande de evento com fila: realidade virtual ou jogo', 'Treinamento de procedimento de risco: realidade virtual'] },
      { h2: 'O que separa útil de passageiro', p: ['A experiência precisa responder por que a pessoa abriria aquilo de novo: conteúdo que muda, coleção, ranking, ou uma tarefa que ela precisa aprender.'] },
    ],
    faqs: [
      { q: 'Realidade aumentada precisa de aplicativo?', a: 'Não precisa: dá para abrir pelo navegador do celular a partir de um QR.' },
      { q: 'Realidade virtual exige óculos caros?', a: 'Exige um óculos de VR; os modelos autônomos dispensam computador.' },
    ],
    links: { product: { to: '/games/treinamento-em-realidade-virtual', label: 'Treinamento em realidade virtual' }, making: { to: '/projetos/astronaut-jetpack', label: 'A experiência da Innovation Week' } },
    works: ['innovation', 'rotulo', 'casaviews'],
    accent: STUDIOS,
  },
  {
    path: '/guias/realidade-aumentada-e-virtual/realidade-aumentada-na-embalagem',
    keyword: 'realidade aumentada na embalagem',
    title: 'Realidade aumentada na embalagem: como funciona | TENKA',
    description: 'Com um QR na embalagem, o celular abre uma experiência: rótulo em 3D, realidade aumentada, jogo e coleção. Veja como a Innovation Week fez isso, unidade por unidade.',
    h1: 'Realidade aumentada na embalagem',
    lead: 'O QR impresso na embalagem abre, no navegador do celular, uma experiência da marca: o rótulo vira 3D, aparece em realidade aumentada na mesa e leva a um jogo. Sem baixar aplicativo.',
    blocks: [
      { h2: 'Como a Innovation Week fez', list: ['Um QR por unidade, com identidade digital própria', 'Rótulo 3D com luz rasante revelando a superfície', 'Realidade aumentada pela câmera do celular', 'Jogo e ranking ao vivo dentro da mesma experiência'] },
      { h2: 'Por que um QR por unidade', p: ['Com um código por embalagem, dá para saber quantas unidades foram abertas, onde, e transformar cada uma num item de coleção.'] },
    ],
    faqs: [
      { q: 'Funciona em qualquer celular?', a: 'A experiência abre no navegador; a parte de realidade aumentada depende do suporte do aparelho, e quem não tem vê o 3D na tela.' },
      { q: 'Precisa mudar a embalagem?', a: 'Só acrescentar o QR na arte.' },
    ],
    links: { product: { to: '/studios/mockup-3d-de-produto', label: 'Mockup e render 3D de produto' }, making: { to: '/projetos/astronaut-jetpack', label: 'O jogo dentro da embalagem' } },
    works: ['innovation', 'rotulo', 'astronaut'],
    accent: STUDIOS,
  },
  {
    path: '/guias/realidade-aumentada-e-virtual/qr-code-na-embalagem-o-que-colocar',
    keyword: 'qr code na embalagem',
    title: 'QR code na embalagem: o que colocar do outro lado | TENKA',
    description: 'Um QR na embalagem só vale se o que abre for melhor que o rótulo. Ideias que funcionam — experiência 3D, coleção, jogo, conteúdo que muda — e o que evitar.',
    h1: 'QR code na embalagem: o que colocar do outro lado',
    lead: 'Coloque do outro lado algo que o rótulo não consegue mostrar: o produto em 3D, um jogo curto, uma coleção ou conteúdo que muda com o tempo. Um QR que abre o site institucional desperdiça a curiosidade de quem escaneou.',
    blocks: [
      { h2: 'O que funciona', list: ['Experiência 3D do produto', 'Jogo curto com o produto na mecânica', 'Coleção: cada unidade, um item', 'Conteúdo novo a cada edição ou lote'] },
      { h2: 'O que evitar', list: ['Página lenta ou que pede cadastro antes de mostrar algo', 'Link que quebra depois da campanha', 'Experiência que só funciona com aplicativo instalado'] },
    ],
    faqs: [
      { q: 'O QR continua funcionando depois da campanha?', a: 'Deve continuar: a embalagem fica na casa da pessoa por muito tempo, então o endereço precisa seguir no ar.' },
      { q: 'Dá para medir quem escaneou?', a: 'Dá: quantos acessos cada QR teve e o que a pessoa fez dentro da experiência.' },
    ],
    links: { product: { to: '/studios/identidade-visual-e-branding', label: 'Identidade visual e branding' }, making: { to: '/projetos/astronaut-jetpack', label: 'Do QR ao jogo, na Innovation Week' } },
    works: ['rotulo', 'innovation', 'casaviews'],
    accent: STUDIOS,
  },
  {
    path: '/guias/realidade-aumentada-e-virtual/ar-ou-vr-qual-escolher',
    keyword: 'realidade aumentada ou virtual',
    title: 'Realidade aumentada ou virtual: qual escolher | TENKA',
    description: 'Realidade aumentada roda no celular de qualquer pessoa; realidade virtual exige óculos, mas isola e imerge. Compare custo, alcance e uso para escolher a certa.',
    h1: 'Realidade aumentada ou virtual: qual escolher',
    lead: 'Escolha realidade aumentada quando quiser alcançar muita gente pelo celular que ela já tem. Escolha realidade virtual quando a pessoa precisa estar imersa — num treinamento ou num estande — e você controla o equipamento.',
    blocks: [
      { h2: 'Realidade aumentada', list: ['Roda no celular, pelo navegador', 'Alcance grande: embalagem, ponto de venda, anúncio', 'Experiência curta e compartilhável'] },
      { h2: 'Realidade virtual', list: ['Exige óculos de VR', 'Imersão total: ninguém se distrai', 'Ótima para treinamento e para fila de evento'] },
    ],
    faqs: [
      { q: 'Dá para ter as duas?', a: 'Dá: o mesmo modelo 3D pode ser usado nas duas experiências.' },
      { q: 'Qual custa menos para começar?', a: 'Depende do conteúdo, mas a realidade aumentada não exige comprar equipamento.' },
    ],
    links: { product: { to: '/games/ativacao-de-marca-em-realidade-virtual', label: 'Ativação de marca em realidade virtual' }, making: { to: '/projetos/meu-mundo', label: 'Como fazemos 3D leve para celular' } },
    works: ['innovation', 'mm-dominios', 'casaviews'],
    accent: STUDIOS,
  },

  // ───────────────────────────── SISTEMAS ─────────────────────────────
  {
    path: '/guias/sistemas',
    keyword: 'sistema sob medida',
    title: 'Sistemas e automação para empresas: guia | TENKA',
    description: 'Quando sair da planilha, quando comprar um sistema pronto e quando fazer um sob medida — com exemplos reais de CRM de academia e atendimento com IA.',
    h1: 'Sistemas e automação para empresas: o guia',
    lead: 'A hora de ter um sistema próprio é quando a operação passa a se adaptar à ferramenta, e não o contrário: planilha que ninguém atualiza, retrabalho entre sistemas, cobrança feita à mão. Antes disso, uma solução pronta costuma bastar.',
    blocks: [
      { h2: 'Sinais de que chegou a hora', list: ['A mesma informação digitada em dois lugares', 'Cobrança e inadimplência controladas à mão', 'Equipamento (catraca, máquina) que não conversa com nada', 'Atendimento que repete as mesmas respostas o dia todo'] },
      { h2: 'Dois exemplos reais', p: ['O Sistema Coliseu juntou captação, matrícula, cobrança e a catraca de reconhecimento facial de uma academia. A Freelandoo atende clientes no WhatsApp com fila e IA.'] },
    ],
    faqs: [
      { q: 'Dá para começar só por uma parte?', a: 'Dá, e costuma ser o melhor: começa pelo que mais trava e conecta ao que já funciona.' },
      { q: 'O sistema fica meu?', a: 'O que é feito sob medida para a sua operação é combinado em contrato, inclusive a hospedagem.' },
    ],
    links: { product: { to: '/tech/sistemas-sob-medida', label: 'Sistemas sob medida' }, making: { to: '/projetos/sistema-coliseu', label: 'Como fizemos o Sistema Coliseu' } },
    works: ['coliseu', 'freelandoo'],
    accent: TECH,
  },
  {
    path: '/guias/sistemas/sistema-pronto-ou-sob-medida',
    keyword: 'sistema pronto ou sob medida',
    title: 'Sistema pronto ou sob medida: como decidir | TENKA',
    description: 'Sistema pronto é rápido e barato no começo; sob medida segue o seu processo. Veja os critérios para decidir e como migrar de um para o outro sem parar a empresa.',
    h1: 'Sistema pronto ou sob medida: como decidir',
    lead: 'Fique no sistema pronto enquanto o seu processo cabe nele. Mande fazer sob medida quando o processo que te diferencia não cabe — ou quando você paga por várias ferramentas que não conversam entre si.',
    blocks: [
      { h2: 'Critérios práticos', list: ['Quanto da operação é igual à de todo mundo do seu ramo', 'Quantas ferramentas você paga e liga à mão', 'Se precisa falar com um equipamento ou sistema específico', 'Quanto tempo a equipe perde contornando a ferramenta'] },
      { h2: 'Migrar sem parar', p: ['Na troca do Sistema Coliseu, os planos e alunos vieram do sistema anterior e, por um período, os dois liberavam a catraca até a data de corte. A academia não parou nenhum dia.'] },
    ],
    faqs: [
      { q: 'Sistema sob medida demora?', a: 'Depende do escopo; por isso o caminho é entregar por partes, começando pela que mais dói.' },
      { q: 'E a manutenção?', a: 'Fica combinada desde o começo: hospedagem, correções e evolução.' },
    ],
    links: { product: { to: '/tech/sistemas-sob-medida', label: 'Sistemas sob medida' }, making: { to: '/projetos/sistema-coliseu', label: 'A migração do Sistema Coliseu' } },
    works: ['coliseu', 'freelandoo'],
    accent: TECH,
  },
  {
    path: '/guias/sistemas/automatizar-atendimento-no-whatsapp',
    keyword: 'automatizar atendimento whatsapp',
    title: 'Como automatizar o atendimento no WhatsApp | TENKA',
    description: 'Automatizar o WhatsApp da empresa: quando um fluxo simples resolve, quando a IA entra, e como fazer pela API oficial sem perder mensagem nem responder duas vezes.',
    h1: 'Como automatizar o atendimento no WhatsApp',
    lead: 'Se a maioria das conversas são as mesmas perguntas, um fluxo simples resolve. Se cada conversa é diferente, entra a IA — sempre pela API oficial do WhatsApp, com fila para não perder mensagem e com uma pessoa podendo assumir a qualquer momento.',
    blocks: [
      { h2: 'O teste rápido', p: ['Olhe as mensagens de uma semana e conte quantas são a mesma meia dúzia de perguntas. É esse número que diz se o caminho é um fluxo ou uma IA.'] },
      { h2: 'Como a Freelandoo faz', list: ['Mensagens recebidas pela API oficial do WhatsApp', 'Tudo entra numa fila antes de ser respondido', 'A IA começa desligada e é ligada por conta', 'A mesma mensagem nunca recebe duas respostas'] },
    ],
    faqs: [
      { q: 'Posso usar meu número atual?', a: 'Em geral sim, migrando o número para a API oficial — e ele deixa de funcionar no aplicativo comum do WhatsApp.' },
      { q: 'E quando a IA não deve responder?', a: 'A IA é ligada por conta, e uma pessoa pode assumir a conversa a qualquer momento.' },
    ],
    links: { product: { to: '/tech/automacoes-e-agentes-de-ia', label: 'Automações e agentes de IA' }, making: { to: '/projetos/freelandoo', label: 'Como a Freelandoo atende no WhatsApp' } },
    works: ['freelandoo', 'coliseu'],
    accent: TECH,
  },
  {
    path: '/guias/sistemas/sistema-para-academia',
    keyword: 'sistema para academia',
    title: 'Sistema para academia com catraca e cobrança | TENKA',
    description: 'O que um sistema de academia precisa juntar: captação, matrícula, cobrança recorrente, catraca com reconhecimento facial e retenção — o caso real do Sistema Coliseu.',
    h1: 'Sistema para academia: o que ele precisa juntar',
    lead: 'Um sistema de academia funciona quando o lead que chega, a matrícula, a cobrança do mês e a porta da catraca são a mesma informação. Assim o aluno em dia entra, o atrasado é avisado e quem sumiu aparece para a recepção chamar.',
    blocks: [
      { h2: 'Os quatro estágios', list: ['Captação: leads por origem, do WhatsApp ao balcão', 'Matrícula: planos, contrato e aula experimental', 'Cobrança: vencimento, inadimplência e renovação', 'Retenção: presença e quem sumiu há 7, 14 ou 21 dias'] },
      { h2: 'A catraca no sistema', p: ['No Sistema Coliseu, um agente instalado no computador da recepção conversa com a catraca de reconhecimento facial e com o servidor — e continua liberando a entrada se a internet cair.'] },
    ],
    faqs: [
      { q: 'Funciona com a minha catraca?', a: 'Depende do modelo e de ele aceitar comandos pela rede; o Coliseu usa uma catraca de reconhecimento facial Control iD.' },
      { q: 'Dá para trazer os alunos do sistema atual?', a: 'Dá: planos e alunos são migrados antes da troca.' },
    ],
    links: { product: { to: '/tech/sistemas-sob-medida', label: 'Sistemas sob medida' }, making: { to: '/projetos/sistema-coliseu', label: 'Bastidores do Sistema Coliseu' } },
    works: ['coliseu', 'freelandoo'],
    accent: TECH,
  },

  // ───────────────────────────── 3D ─────────────────────────────
  {
    path: '/guias/3d',
    keyword: 'modelagem 3d para empresas',
    title: '3D para marcas: produto, site e personagem | TENKA',
    description: 'Onde o 3D trabalha para uma marca: mockup de produto, site que mostra o produto por dentro, embalagem e personagem. Veja o que cada uso exige e exemplos reais.',
    h1: '3D para marcas: produto, site e personagem',
    lead: 'Um modelo 3D bem feito do seu produto vira várias coisas: imagem de campanha, cena no site, rótulo em 3D e realidade aumentada. Por isso ele vale mais quando é pensado desde o começo para ser reaproveitado.',
    blocks: [
      { h2: 'Os usos mais comuns', list: ['Mockup e render de produto para campanha', 'Produto 3D no site, girando ou se montando', 'Rótulo e embalagem em 3D', 'Personagem da marca ou do jogo'] },
      { h2: 'Feito para reaproveitar', p: ['O ar-condicionado da GS saiu de um script no Blender que gera o modelo, as poses e as imagens das peças — o mesmo arquivo alimenta o site e os pôsteres.'] },
    ],
    faqs: [
      { q: 'Preciso mandar o produto?', a: 'Fotos, medidas e, quando existe, a vista explodida ou o arquivo de projeto bastam.' },
      { q: 'O modelo fica comigo?', a: 'Os arquivos entregues são combinados no orçamento.' },
    ],
    links: { product: { to: '/studios/mockup-3d-de-produto', label: 'Mockup 3D de produto' }, making: { to: '/projetos/gs-refrigeracao', label: 'O modelo 3D da GS por dentro' } },
    works: ['gs', 'excelencia', 'rotulo', 'personagens-catdemon'],
    accent: STUDIOS,
  },
  {
    path: '/guias/3d/mockup-3d-de-produto',
    keyword: 'mockup 3d de produto',
    title: 'Mockup 3D de produto: o que é e quando usar | TENKA',
    description: 'Mockup 3D é o seu produto feito em computador para gerar imagens de campanha antes ou depois de existir. Veja como ele é feito e quanto ele rende além da foto.',
    h1: 'Mockup 3D de produto: o que é e quando usar',
    lead: 'Mockup 3D é o seu produto recriado em computador com medidas e materiais reais. Com ele saem imagens de campanha sem estúdio, variações de cor e de rótulo, e até a cena 3D do site — antes mesmo de o produto ficar pronto.',
    blocks: [
      { h2: 'Quando ele compensa', list: ['Lançamento de produto que ainda não foi fabricado', 'Muitas variações de cor ou de rótulo', 'Produto difícil de fotografar por dentro', 'Campanha que vai precisar de imagem nova sempre'] },
      { h2: 'Um exemplo por dentro', p: ['O freezer da Excelência foi montado peça por peça no Blender, com a porta presa na dobradiça e as prateleiras completas — o mesmo modelo se desmonta no site.'] },
    ],
    faqs: [
      { q: 'Fica igual a uma foto?', a: 'Fica realista quando materiais e luz são feitos com cuidado; e mostra ângulos que a foto não alcança.' },
      { q: 'Posso usar em embalagem e anúncio?', a: 'Pode: as imagens saem na resolução de cada uso.' },
    ],
    links: { product: { to: '/studios/mockup-3d-de-produto', label: 'Mockup 3D de produto' }, making: { to: '/projetos/excelencia-refrigeracao', label: 'O freezer 3D da Excelência' } },
    works: ['excelencia', 'gs', 'rotulo'],
    accent: STUDIOS,
  },
  {
    path: '/guias/3d/personagem-3d-para-marca',
    keyword: 'personagem 3d para marca',
    title: 'Personagem 3D para marca e jogo: como é criado | TENKA',
    description: 'Do retrato à folha de modelo, ao 3D e ao esqueleto que anima: as etapas de criação de um personagem para marca ou jogo, com os personagens do EVO e do Meu Mundo.',
    h1: 'Personagem 3D para marca e jogo: como é criado',
    lead: 'Um personagem passa por retrato, folha de modelo de frente e de lado, modelo 3D, esqueleto e animação. Cada etapa é aprovada antes da próxima — mudar um desenho custa bem menos que mudar um personagem já animado.',
    blocks: [
      { h2: 'As etapas', list: ['Retrato: a personalidade e as cores', 'Folha de modelo: proporção de frente e de lado', 'Modelo 3D a partir da folha', 'Esqueleto e animações'] },
      { h2: 'Onde ele vive depois', p: ['O mesmo personagem pode ir para o jogo, para a embalagem, para o site e para a realidade aumentada — como o astronauta da Innovation Week, que está no rótulo e no jogo.'] },
    ],
    faqs: [
      { q: 'Posso aprovar antes do 3D?', a: 'Deve: retrato e folha de modelo são aprovados antes de qualquer modelagem.' },
      { q: 'O personagem anima no navegador?', a: 'Anima, com uma versão mais leve do modelo para o celular.' },
    ],
    links: { product: { to: '/studios/animacao-3d', label: 'Animação 3D' }, making: { to: '/projetos/evo-brazil', label: 'Os personagens do EVO Brazil' } },
    works: ['personagens-catdemon', 'personagens-mm', 'evo'],
    accent: STUDIOS,
  },
];
