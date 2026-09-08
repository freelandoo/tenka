# Integração Asaas — escopo inicial

## O que está ativo

- Toda configuração é administrativa, em **Administração → Financeiro**.
- O projeto é criado primeiro e o plano financeiro é configurado depois (fluxo A).
- Cada projeto pode ter uma única assinatura mensal.
- Somente a assinatura mensal gera cobrança no Asaas nesta fase.
- O valor do projeto pode ser dividido em pagamentos internos; eles não são enviados ao Asaas.
- Webhooks atualizam as competências mensais e são idempotentes pelo ID do evento.
- Operações externas usam fila persistente com retomada automática.

## Configuração

Defina no backend/Railway:

```env
ASAAS_ENVIRONMENT=sandbox
ASAAS_API_KEY=<chave da API>
ASAAS_WEBHOOK_TOKEN=<token forte e exclusivo>
ASAAS_TIMEOUT_MS=15000
```

No Asaas, configure o webhook para:

```text
https://<dominio-do-backend>/webhooks/asaas
```

O token do webhook precisa ser exatamente o mesmo de `ASAAS_WEBHOOK_TOKEN`.
Comece em `sandbox`; a troca para `production` deve acontecer somente depois de
uma cobrança completa ter sido validada no ambiente de testes.

## Dados necessários para ativar

Antes de ativar uma assinatura, o projeto precisa estar ligado a um cliente e o
cadastro do cliente precisa ter CPF/CNPJ. Nome, e-mail e telefone são
sincronizados quando uma operação da assinatura é processada.

## Fora deste incremento

- Não existe página financeira no portal do cliente.
- Parcelas ou outros valores do projeto não geram cobrança no Asaas.
- A régua de WhatsApp/e-mail (D-5, D-3, D0, D+1, D+7) ainda não dispara. Ela
  será implementada após a definição dos canais e textos; os pagamentos já
  ficam separados por competência para suportar essa etapa.
