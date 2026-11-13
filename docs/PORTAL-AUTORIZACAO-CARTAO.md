# Portal de autorização de cartão — estado local

## Auditoria inicial

O aplicativo já possuía clientes e projetos, hospedagem mensal, serviços adicionais com frequências mensal, trimestral, semestral, anual e única, configuração central de vencimento, fila financeira, cobrança consolidada, Checkout de hospedagem, webhooks idempotentes e conciliação do Asaas.

O Checkout recorrente existente cria uma assinatura fixa. Ele não resolve sozinho a cobrança variável de hospedagem mais renovações ocasionais em um único débito. Também não existia persistência de token reutilizável de cartão.

## Arquitetura implementada

- Link público com 32 bytes aleatórios; o SHA-256 é usado na consulta pública e o segredo fica criptografado com AES-256-GCM somente para o painel administrativo poder recuperá-lo.
- Link vinculado a cliente, projeto, versão do termo e fotografia imutável dos serviços.
- Expiração padrão de 24 horas, revogação, uso único e limite de tentativas.
- Confirmação adicional pelo CPF/CNPJ previamente cadastrado.
- Tokenização pelo endpoint `POST /v3/creditCard/tokenizeCreditCard`, somente no Sandbox.
- Token do provedor protegido com AES-256-GCM; número completo e CVV não são persistidos.
- Histórico de criação do link, aceite, substituição, revogação e falha de tokenização.
- A cobrança consolidada no cartão só é executada no vencimento, usa o token do mesmo cliente e valida limite e itens abrangidos pelo aceite.
- Um novo serviço, aumento de valor, mudança de frequência ou de vencimento exige novo aceite. Reduções e remoções continuam cobertas pela autorização anterior.
- Cliente com assinatura fixa ou Checkout recorrente ainda aberto no Asaas não pode gerar o novo link até uma migração financeira explícita, evitando duplicidade.

## Página pública

A rota `/autorizar-cobrancas/:token` apresenta cliente, serviços, frequências, valores, vencimento, exemplo de variação, limite máximo do ciclo e condições do aceite. Inclui estados de carregamento, sucesso, link expirado, usado e revogado.

A página usa o logo oficial da Tenka Group, não carrega analytics, banner de cookies nem WhatsApp e recebe cabeçalhos `noindex`, `no-store`, `no-referrer`, CSP e bloqueio de framing na configuração do frontend.

## Administração

Na seção de serviços recorrentes do projeto, o administrador primeiro cadastra e organiza a hospedagem e os serviços adicionais como rascunhos. Somente depois da revisão ele usa **Preparar link de autorização**. O link permanece disponível para cópia durante 24 horas.

Se um serviço novo ampliar o escopo depois que um link já foi criado, o link anterior é revogado ao recarregar a situação financeira e o painel solicita uma preparação manual atualizada. A autorização anterior continua cobrindo somente os itens já aceitos até o cliente confirmar a substituição.

O administrador também pode renovar o link imediatamente, solicitar troca do cartão e retirar a autorização. A retirada impede novos débitos automáticos, sem cancelar os serviços ou apagar o histórico; depois de uma retirada explícita, um novo link depende de ação manual.

## Segurança e limites

Esta implementação não está liberada para cartões reais. A captura própria aumenta o escopo PCI DSS porque os dados passam pela infraestrutura da Tenka antes da tokenização. Produção permanece bloqueada no backend mesmo que a interface seja acessada.

Antes de produção ainda são necessários:

1. Habilitação formal da tokenização na conta Asaas.
2. Revisão PCI DSS da captura própria ou adoção de uma captura hospedada/isolada oficialmente compatível com token reutilizável.
3. Revisão jurídica do termo, reajustes, revogação, retenção e bases legais da LGPD.
4. Chave `CARD_TOKEN_ENCRYPTION_KEY` em cofre de segredos, com processo de rotação.
5. Migração explícita das assinaturas fixas existentes, sem dupla cobrança.
6. Rate limit compartilhado em Postgres ou Redis antes de usar múltiplas réplicas.
7. Teste completo com cartão fictício e webhooks no Sandbox.

## Validação local

- Backend: compilação TypeScript e suíte unitária completa.
- Frontend: compilação, suíte completa e testes da página pública.
- Visual: desktop 1440 × 1000 e celular 390 × 844, sem overflow e com formulário acessível.
- Integrações Postgres isoladas permanecem condicionadas a `TENKA_MONTHLY_DB_TEST=1`.
- O ambiente local não possui chave do Asaas nem chave de criptografia configuradas; por isso nenhuma tokenização Sandbox foi executada.

Nenhuma migration foi aplicada, nenhuma cobrança foi criada e nenhum dado de cartão real foi utilizado.
