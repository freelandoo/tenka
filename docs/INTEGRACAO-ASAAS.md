# Integração Asaas

## O que está ativo

- Toda configuração é administrativa, em **Administração → Financeiro**.
- O projeto é criado primeiro e o plano financeiro é configurado depois.
- Cada projeto pode ter uma única assinatura mensal.
- Etapas e parcelas do projeto **também** geram cobrança no Asaas, uma por linha
  do plano, referenciadas por `project-payment:<uuid>` em `externalReference`.
- Webhooks atualizam mensalidades e cobranças de projeto, e são idempotentes
  pelo ID do evento. `provider_event_at` descarta eventos fora de ordem.
- Operações externas usam fila persistente (`asaas_operations`) com retentativa
  exponencial e desduplicação por operação em voo.
- Uma conciliação automática compara Tenka e Asaas a cada `FINANCE_RECONCILIATION_HOURS`.

## Configuração

Defina no backend/Railway:

```env
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY=<chave da API>
ASAAS_WEBHOOK_TOKEN=<token forte e exclusivo>
ASAAS_TIMEOUT_MS=15000
FINANCE_RECONCILIATION_HOURS=6
```

No Asaas, configure o webhook para:

```text
https://<dominio-do-backend>/webhooks/asaas
```

O token do webhook precisa ser exatamente o mesmo de `ASAAS_WEBHOOK_TOKEN`.
Comece em `sandbox`; a troca para `production` deve acontecer somente depois de
uma cobrança completa ter sido validada no ambiente de testes.

`FINANCE_RECONCILIATION_HOURS=0` desliga a conciliação automática; o botão
"Conciliar agora" continua funcionando.

## Dados necessários para ativar

Antes de ativar uma assinatura ou emitir uma cobrança de etapa, o projeto
precisa estar ligado a um cliente e o cadastro do cliente precisa ter CPF/CNPJ.
Nome, e-mail e telefone são sincronizados quando a operação é processada.

## Quem manda em quê

O webhook é a autoridade de qualquer cobrança que já existe no Asaas. Enquanto
a linha é local (`sync_status = 'local'`), a Tenka decide sozinha — é o único
caso em que o botão "Pago" aparece. A partir da emissão, status e vencimento só
mudam pelo provedor; o painel oferece "Registrar pagamento por fora", que pede
a baixa ao Asaas e espera o `PAYMENT_RECEIVED` voltar.

## Ciclo de vida

- **Cancelar uma cobrança** apaga-a no Asaas e devolve a etapa ao plano: o valor
  dela deixa de ocupar o contrato e a linha pode ser removida ou reemitida.
- **Arquivar o projeto** encerra o financeiro junto — pede uma decisão sobre a
  mensalidade e cancela as cobranças de etapa em aberto. Sem isso o cliente
  continuaria recebendo boleto de um projeto invisível no painel.
- **Finalizar** não mexe nas cobranças: um projeto entregue ainda tem o que
  receber.
- **Estorno e chargeback** têm estado próprio (`refunded`, `chargeback`) e
  preservam a data do recebimento. Não são cancelamento.

## Quando algo para

A **fila de atenção**, em Administração → Financeiro, lista o que não anda
sozinho: operações que gastaram as cinco tentativas, operações com resultado
indefinido no provedor (`uncertain`) e webhooks que chegaram sem alvo
reconhecido. Cada item aceita reprocessar ou encerrar com justificativa, e o
alerta aparece no topo da página enquanto houver algo parado.

## Auditoria

Ficam no histórico do projeto: configuração e cancelamento de mensalidade,
alteração do plano de pagamentos, mudança de estado de um pagamento, baixa
manual (com valor, data e quem registrou) e o encerramento de cobranças por
arquivamento. A baixa manual depende disso: a chave de API é única, e o Asaas
não sabe qual pessoa da equipe apertou o botão.

## Fora deste incremento

- Não existe página financeira no portal do cliente.
- A Tenka não desfaz uma baixa manual. O Asaas expõe `undoReceivedInCash`, mas
  a reversão hoje é feita no painel dele; por isso a ação pede confirmação
  explícita antes de sair.
- A régua de WhatsApp/e-mail (D-5, D-3, D0, D+1, D+7) ainda não dispara. Ela
  será implementada após a definição dos canais e textos; os pagamentos já
  ficam separados por competência para suportar essa etapa.
