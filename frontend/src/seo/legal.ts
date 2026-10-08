import type { SeoRoute } from './routes';

/**
 * Política de privacidade e cookies.
 *
 * O conteúdo foi montado a partir de três fontes, não de um gerador:
 *  - LGPD art. 9 (o que o titular precisa poder saber), art. 18 (direitos),
 *    art. 33 (transferência internacional) e art. 41 (encarregado);
 *  - guia orientativo da ANPD sobre cookies, que admite legítimo interesse
 *    para medição de audiência e desaconselha consentimento tácito;
 *  - inventário de seções de políticas reais de empresas do mesmo mercado,
 *    usado como referência de ORGANIZAÇÃO — nenhum texto foi copiado.
 *
 * Duas coisas aqui são específicas da TENKA e nenhum modelo pronto traria:
 *  - o formulário e o briefing não têm backend; os dados saem por WhatsApp ou
 *    e-mail, então quem armazena são Meta e Google, não a TENKA;
 *  - o painel do cliente é regido pelo contrato, não por esta política.
 */

/**
 * Data da última conferência do conteúdo contra a legislação vigente.
 *
 * Existe um teste que falha quando esta data passa de 12 meses. Política de
 * privacidade desatualizada não quebra build nem dá erro em tela — ela só
 * envelhece em silêncio até alguém precisar dela. O teste é o que transforma
 * "revisar um dia" em tarefa que aparece.
 */
export const POLICY_REVIEWED_AT = '2026-10-07';

/** Meses até o teste de obsolescência acusar. */
export const POLICY_REVIEW_MONTHS = 12;

export interface PolicySection {
  title: string;
  /** Parágrafos de texto corrido. */
  body?: string[];
  /** Lista de itens, quando a informação é um inventário. */
  items?: { term: string; detail: string }[];
}

export const LEGAL_ROUTES: SeoRoute[] = [
  {
    path: '/politica-de-privacidade',
    title: 'Política de Privacidade e Cookies | Tenka Group',
    description:
      'Como a Tenka Group trata dados pessoais: quais dados coletamos, com que base legal, por quanto tempo, com quem compartilhamos e como exercer seus direitos pela LGPD.',
    h1: 'Política de Privacidade e Cookies',
    intro:
      'Esta política explica quais dados pessoais a Tenka Group trata quando você usa este site, com que finalidade e com qual base legal, por quanto tempo guardamos, com quem compartilhamos e como você exerce os direitos que a LGPD garante.',
    priority: 0.3,
    changefreq: 'yearly',
  },
];

export const POLICY_SECTIONS: PolicySection[] = [
  {
    title: '1. Quem é o controlador',
    body: [
      'A controladora dos dados tratados neste site é a Tenka Group, sediada em São Paulo — SP, Brasil. Atendemos empresas em todo o país; o atendimento é remoto ou presencial no cliente.',
      'Para qualquer assunto relacionado a dados pessoais, incluindo o exercício dos direitos descritos na seção 10, o canal é grupotenka@gmail.com.',
    ],
  },
  {
    title: '2. Resumo, em uma linha',
    body: [
      'Coletamos o que você escreve nos formulários de contato e dados de navegação agregados para medir a audiência do site. Não vendemos dados, não usamos cookies de publicidade, não criamos perfis e não enviamos e-mail marketing sem que você peça.',
    ],
  },
  {
    title: '3. Dados que coletamos',
    items: [
      {
        term: 'Dados que você fornece',
        detail:
          'Nome, e-mail, empresa e a descrição do projeto que você escreve no formulário de contato ou no briefing. Só os campos que você preenche — nada é obrigatório além do necessário para responder.',
      },
      {
        term: 'Dados coletados automaticamente',
        detail:
          'Páginas visitadas, origem do acesso, tipo de dispositivo, navegador, idioma e dados aproximados de localização derivados do IP, coletados pelo Google Analytics de forma agregada. Não identificamos você individualmente a partir desses dados.',
      },
      {
        term: 'Dados do Search Console',
        detail:
          'Termos de busca que levaram ao site, em formato agregado e já anonimizado pelo Google. Não recebemos quem pesquisou o quê.',
      },
    ],
  },
  {
    title: '4. Para que usamos, e com que base legal',
    items: [
      {
        term: 'Responder a contatos e briefings',
        detail:
          'Base legal: procedimentos preliminares relacionados a contrato, a seu pedido (LGPD, art. 7º, V). Usamos o que você escreveu para entender a demanda e responder.',
      },
      {
        term: 'Medir a audiência do site',
        detail:
          'Base legal: legítimo interesse (art. 7º, IX). O tratamento se limita a identificar padrões e tendências com dados agregados, sem cruzamento com outros rastreadores e sem formação de perfis — condições em que o guia orientativo da ANPD admite essa base. Você pode recusar a medição a qualquer momento, como descrito na seção 5.',
      },
      {
        term: 'Segurança e funcionamento do site',
        detail:
          'Base legal: legítimo interesse. Inclui registros técnicos necessários para manter o site no ar e protegido contra abuso.',
      },
    ],
  },
  {
    title: '5. Cookies e tecnologias semelhantes',
    body: [
      'Usamos duas categorias de armazenamento no seu navegador, e nenhuma delas é de publicidade.',
    ],
    items: [
      {
        term: 'Necessários',
        detail:
          'Guardam preferências mínimas de funcionamento, incluindo a sua própria escolha sobre a medição. Sem eles o site não consegue lembrar que você recusou. Base legal: legítimo interesse.',
      },
      {
        term: 'De medição (Google Analytics)',
        detail:
          'Contam visitas e páginas vistas de forma agregada. Base legal: legítimo interesse. Para recusar, use o botão "Recusar medição" no aviso exibido na primeira visita. Se já tiver respondido e quiser mudar, limpe os dados do site no seu navegador para o aviso aparecer de novo, ou escreva para grupotenka@gmail.com.',
      },
      {
        term: 'De publicidade',
        detail:
          'Não utilizamos. Os sinais de publicidade do Google (ad_storage, ad_user_data e ad_personalization) estão negados por padrão na configuração do site.',
      },
    ],
  },
  {
    title: '6. Com quem compartilhamos',
    body: [
      'Não vendemos nem cedemos dados pessoais. Compartilhamos apenas com os fornecedores necessários para o site funcionar e para conseguirmos responder você:',
    ],
    items: [
      {
        term: 'Google (Analytics e Search Console)',
        detail:
          'Medição de audiência e dados de busca, em formato agregado.',
      },
      {
        term: 'Google (Gmail)',
        detail:
          'Quando você nos escreve por e-mail, a mensagem fica hospedada na caixa de entrada.',
      },
      {
        term: 'Meta (WhatsApp)',
        detail:
          'O formulário de contato e o briefing deste site não têm servidor próprio: eles montam a mensagem e abrem o WhatsApp ou o seu e-mail para que você mesmo envie. Isso significa que o conteúdo do briefing trafega e fica armazenado na plataforma que você escolher usar, sob os termos dela, e não num banco de dados da Tenka.',
      },
      {
        term: 'Vercel',
        detail:
          'Hospedagem do site. Processa registros técnicos de acesso.',
      },
    ],
  },
  {
    title: '7. Transferência internacional de dados',
    body: [
      'Os fornecedores citados na seção 6 são empresas estrangeiras e processam dados fora do Brasil, principalmente nos Estados Unidos. Isso caracteriza transferência internacional, tratada nos arts. 33 a 36 da LGPD e regulamentada pela Resolução CD/ANPD nº 19/2024.',
      'A transferência se apoia nos instrumentos contratuais oferecidos por esses fornecedores, incluindo cláusulas-padrão contratuais. Mediante solicitação pelo canal da seção 1, disponibilizamos informações sobre os instrumentos aplicáveis, respeitados os segredos comercial e industrial.',
    ],
  },
  {
    title: '8. Por quanto tempo guardamos',
    items: [
      {
        term: 'Mensagens de contato e briefings',
        detail:
          'Enquanto durar a conversa comercial e pelo prazo necessário para eventual contratação. Se não houver contratação, até 24 meses, salvo obrigação legal que exija prazo maior.',
      },
      {
        term: 'Dados de medição',
        detail:
          'Conforme a retenção configurada no Google Analytics, limitada a 14 meses para dados de usuário e evento.',
      },
      {
        term: 'Dados de clientes contratados',
        detail:
          'O painel em tenkagroup.com.br/painel é área restrita de clientes e equipe, regida pelo contrato de prestação de serviços e não por esta política.',
      },
    ],
  },
  {
    title: '9. Segurança',
    body: [
      'O site é servido exclusivamente por HTTPS. O acesso à área restrita exige autenticação e tem controle de permissão por papel. Adotamos medidas técnicas e administrativas razoáveis para proteger os dados, reconhecendo que nenhum sistema é absolutamente imune a incidentes.',
    ],
  },
  {
    title: '10. Seus direitos',
    body: [
      'A LGPD (art. 18) garante a você, a qualquer momento e gratuitamente, o direito de:',
    ],
    items: [
      { term: 'Confirmação e acesso', detail: 'Saber se tratamos dados seus e obter acesso a eles.' },
      { term: 'Correção', detail: 'Corrigir dados incompletos, inexatos ou desatualizados.' },
      {
        term: 'Anonimização, bloqueio ou eliminação',
        detail: 'De dados desnecessários, excessivos ou tratados em desconformidade com a lei.',
      },
      { term: 'Portabilidade', detail: 'Solicitar a portabilidade a outro fornecedor, nos termos da regulamentação.' },
      { term: 'Eliminação', detail: 'Dos dados tratados com base no seu consentimento.' },
      { term: 'Informação sobre compartilhamento', detail: 'Saber com quem compartilhamos seus dados.' },
      {
        term: 'Oposição',
        detail:
          'Opor-se a tratamento fundamentado em legítimo interesse — é o que a recusa da medição faz na prática.',
      },
      { term: 'Revogação do consentimento', detail: 'Quando o tratamento se apoiar em consentimento.' },
    ],
  },
  {
    title: '11. Como exercer seus direitos',
    body: [
      'Escreva para grupotenka@gmail.com com o pedido. Podemos solicitar informações que confirmem sua identidade, apenas para evitar que terceiros acessem dados seus. Respondemos no menor prazo possível e, nos casos em que a lei fixa prazo, dentro dele.',
      'Se alguma solicitação não puder ser atendida, explicamos o motivo — por exemplo, quando houver obrigação legal de guardar o dado.',
    ],
  },
  {
    title: '12. Encarregado pelo tratamento de dados',
    body: [
      'O canal de comunicação com o encarregado, previsto no art. 41 da LGPD, é grupotenka@gmail.com. Pedidos, reclamações e dúvidas sobre dados pessoais recebidos por esse endereço são encaminhados ao responsável designado.',
    ],
  },
  {
    title: '13. Crianças e adolescentes',
    body: [
      'Este site é dirigido a empresas e profissionais. Não coletamos intencionalmente dados de menores de 18 anos. Se identificarmos coleta nessa condição, eliminamos o registro. Se você é responsável e acredita que isso ocorreu, escreva para o canal da seção 1.',
    ],
  },
  {
    title: '14. Links para outros sites',
    body: [
      'Nossas páginas podem conter links para sites de terceiros, inclusive nossos perfis em redes sociais. Esta política não se aplica a eles; consulte a política de cada um.',
    ],
  },
  {
    title: '15. Alterações nesta política',
    body: [
      'Podemos atualizar esta política para refletir mudanças no site, nos fornecedores ou na legislação. A data da última revisão fica indicada no início da página. Alterações relevantes em finalidades, forma, duração, identificação do controlador ou compartilhamento são comunicadas de forma destacada, conforme o art. 9º, § 6º da LGPD.',
    ],
  },
];
