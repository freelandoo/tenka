# Atendimento WhatsApp + Reunião no Meet

Porte do subsistema de atendimento do **Coliseu** (`coliseu-backend`, Next.js +
Prisma) para a arquitetura do TENKA (Fastify + pg no Railway, React + Vite no
Vercel), com as mudanças pedidas: a observação do post-it vira registro de
mensagens com três canais de saída, e o botão Reunião agenda no Google Meet.

## O que mudou para quem usa

**No post-it do Kanban → bolinha OBS:**

- A caixa de texto continua no mesmo lugar. Abaixo dela, agora:
  - **Agendar reunião** — abre dia/hora/duração, cria a sala no Google Meet e
    **cola o link na caixa de texto**. Não envia nada a ninguém.
  - **Só registrar** — o comportamento de hoje: grava e fica no painel.
  - **Comunicação interna** — manda para o grupo do WhatsApp da agência.
  - **Aprovação** — manda para o WhatsApp do cliente cadastrado no projeto
    (`client_phone`). Desabilitado se o projeto não tem telefone.
  - **Reunião** — manda para os **dois** (cliente + grupo interno), com a
    data/hora e o link. Só habilita depois de a reunião estar agendada.
- **Não existe mais editar.** O botão sumiu, a rota `PATCH /notes/:id` foi
  removida e o banco recusa `UPDATE` em `body`/`channel` (trigger
  `project_notes_no_edit`). Cada observação exibe por qual canal saiu e se a
  entrega falhou.
- **Aviso de contato frio**: se o cliente do projeto nunca escreveu para nós,
  aparece um alerta âmbar acima dos botões. Ele **não bloqueia** nada — ver
  "Risco de banimento" abaixo.

**Nova aba `Atendimento` (admin):** inbox com abas **Conversas** e **Grupos**,
histórico em bolhas e composer para responder. É a mesma separação do Coliseu —
grupo fala muito mais que cliente e, sem separar, a aprovação de um projeto
afundaria embaixo do papo do grupo.

No topo dela, três cartões de integração: conectar o número por QR Code,
escolher o grupo de **Comunicação Interna** e autorizar a **agenda do Google**.

## Recorte de acesso

| Ação                                       | Quem      |
| ------------------------------------------ | --------- |
| Aba Atendimento (todas as conversas)       | admin     |
| Conectar/desconectar número, grupo, Google | admin     |
| Enviar pela observação do post-it          | admin + colaborador atribuído ao projeto |

A inbox é de admin porque concentra as conversas de **todos** os clientes num só
lugar; abri-la a colaborador furaria o recorte por atribuição que o Kanban já
aplica. O colaborador continua conversando com o cliente dele pelo post-it.

## Arquitetura

```
┌──────────────┐  interno   ┌───────────────┐   Baileys    ┌──────────┐
│ tenka-backend│──────────▶ │ evolution-api │ ◀──────────▶ │ WhatsApp │
│  (Fastify)   │  HTTP      │    v2.3.7     │              └──────────┘
└──────────────┘            └───────────────┘
      ▲                         │      │
      │ webhook HTTPS público   │      │ cache de sessão
      └─────────────────────────┘      ▼
                                ┌───────────────┐
   ambos ──▶ Postgres           │     redis     │
   (schemas separados)          └───────────────┘
```

- **evolution-api**: `evoapicloud/evolution-api:v2.3.7`, volume em
  `/evolution/instances`. **Nunca exposta publicamente** — só rede interna.
- **redis**: cache de sessão do Baileys (`CACHE_REDIS_ENABLED=true`). É o que
  segura reconexão estável sem repareamento por QR. **O backend do TENKA não usa
  Redis** — a ingestão é síncrona e idempotente, sem fila.
- **Postgres**: a Evolution usa o mesmo banco em `?schema=evolution`; o TENKA
  continua em `public`. Não colidem, e evita um quarto serviço.

Direções de tráfego:

- TENKA → Evolution: `http://evolution-api.railway.internal:8080`, header `apikey`.
- Evolution → TENKA: `POST https://<backend>/webhooks/whatsapp`, header
  `x-webhook-secret`. Eventos: `MESSAGES_UPSERT`, `CONNECTION_UPDATE`,
  `QRCODE_UPDATED`.

## Arquivos

Backend (`backend/src/whatsapp/`):

| Arquivo       | Papel |
| ------------- | ----- |
| `evolution.ts`| Client HTTP da Evolution. **Único módulo que envia mensagem.** |
| `payload.ts`  | Leitura do payload Baileys. Puro, sem banco nem rede. |
| `phone.ts`    | Normalização de telefone; casamento por últimos 8 dígitos. |
| `repo.ts`     | SQL de instância, conversas e mensagens. |
| `ingest.ts`   | Ingestão do webhook. **Não importa `evolution.ts`.** |
| `outbound.ts` | Saída manual: inbox e botões da observação. |

Rotas: `modules/whatsapp.ts` (inbox e configuração), `modules/webhooks.ts`
(entrada da Evolution), `modules/meetings.ts` (Google OAuth + criar reunião).
Google: `google/calendar.ts`.

Frontend: `features/whatsapp/` (inbox, integrações, hooks de SSE, services) e
`features/projects/components/ProjectNotes.tsx` (a observação com canais).

## A garantia de "sem automação"

Nenhum caminho de código do webhook chega a um `sendText`. Isso não é
convenção — é testado. `src/whatsapp/no-send.test.ts` percorre o fecho
transitivo dos imports a partir de `ingest.ts` e de `modules/webhooks.ts` e
falha se algum alcançar `evolution.ts`, com um controle negativo (`outbound.ts`
*deve* alcançar) para o teste não passar por engano.

```
npm test --prefix backend
```

## Realtime

Sem polling. Tudo pelo SSE que já existe (`GET /events`):

| Evento             | Origem                                | Quem escuta |
| ------------------ | ------------------------------------- | ----------- |
| `wa_conversations` | statement-level na tabela             | lista da inbox, cartões de integração |
| `wa_messages`      | row-level, payload leva `c` (conversa)| thread aberta (ignora se for de outra) |
| `project_notes`    | statement-level                       | painel de observações do projeto |

Os triggers estão em `backend/migrations/0012_whatsapp.sql`.

## Deploy no Railway

No projeto `resourceful-unity` (o mesmo do backend), criar **dois** serviços.

### 1. `redis`

Imagem `redis:7-alpine`. Sem porta pública, sem variáveis.

### 2. `evolution-api`

Imagem `evoapicloud/evolution-api:v2.3.7`. Volume montado em
`/evolution/instances` (**sem ele, todo restart pede QR de novo**). Sem porta
pública. Variáveis:

```
SERVER_URL=http://evolution-api.railway.internal:8080
AUTHENTICATION_API_KEY=<gerar 32+ bytes aleatórios>
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=${{Postgres.DATABASE_URL}}?schema=evolution
DATABASE_CONNECTION_CLIENT_NAME=evolution
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis.railway.internal:6379
CACHE_REDIS_PREFIX_KEY=evolution
```

### 3. No serviço `tenka` (backend), adicionar

```
EVOLUTION_URL=http://evolution-api.railway.internal:8080
EVOLUTION_API_KEY=<a MESMA chave do AUTHENTICATION_API_KEY>
EVOLUTION_INSTANCE=tenka
WHATSAPP_WEBHOOK_SECRET=<gerar>
PUBLIC_API_URL=https://tenka-production.up.railway.app
PANEL_URL=https://tenka-brown.vercel.app
GOOGLE_CLIENT_ID=<do Google Cloud>
GOOGLE_CLIENT_SECRET=<do Google Cloud>
GOOGLE_REDIRECT_URI=https://tenka-production.up.railway.app/google/callback
```

A migration `0012` roda sozinha no boot (`RUN_MIGRATIONS_ON_BOOT`).

### 4. Google Cloud (uma vez)

1. Console → novo projeto → **ativar a Google Calendar API**.
2. Tela de consentimento OAuth: tipo **Externo**, adicionar a conta da TENKA em
   *usuários de teste* (evita a revisão de verificação enquanto for uso interno).
3. Credenciais → **ID do cliente OAuth** → *Aplicativo Web* → em "URIs de
   redirecionamento autorizados" colar exatamente o `GOOGLE_REDIRECT_URI`.
4. Copiar Client ID/Secret para as variáveis do Railway.

### 5. Ligar tudo no painel

`/painel/atendimento` → **Conectar por QR Code** → parear com o celular →
**Escolher grupo** de Comunicação Interna → **Conectar agenda** do Google.

## Risco de banimento

O que derruba número **não é enviar** — é **bloqueio e denúncia de quem
recebe**. Esse é o sinal dominante, e ele quase só aparece quando a mensagem
chega a alguém que não reconhece o número. Quando o cliente escreve primeiro,
ele está esperando resposta e não denuncia.

Por isso o painel guarda `wa_conversations.first_inbound_at` (migration `0013`):
o instante em que aquele contato nos escreveu pela primeira vez, `null` se nunca
escreveu. `GET /projects/:id/contact-status` responde por projeto e o post-it
mostra o aviso âmbar quando `hasInbound` é falso. O aviso some sozinho na
primeira mensagem que o cliente mandar — o SSE de `wa_messages` refaz a
consulta, sem recarregar a página.

**Avisa, não bloqueia.** Existe caso legítimo de primeiro contato (cliente que
fechou por e-mail e espera o retorno), e um botão travado ensinaria a pessoa a
procurar como burlar. Um aviso que se explica ensina a pedir o "oi" antes.

Enviar **não** marca o contato como conhecido: só mensagem recebida limpa o
aviso. É proposital — mandar cinco mensagens para quem nunca respondeu é
exatamente o padrão de risco, não o contrário.

Outros fatores, em ordem de peso: número novo disparando muito de cara; mensagem
idêntica repetida em escala; volume alto para números que nunca escreveram. Uma
aprovação por projeto, escrita à mão, não é nenhum dos três.

**Ressalva que o aviso não cobre**: a Evolution usa Baileys, cliente não-oficial
(WhatsApp Web engenheirado reverso). Isso viola os termos e carrega risco de
base independente de comportamento. O caminho sem esse risco é a Cloud API
oficial da Meta — que cobra por conversa e exige template aprovado justamente
para mensagem iniciada pela empresa. Para o volume de uma agência, a troca
escolhida aqui é razoável; não é risco zero. Nada disso é documentado pela Meta:
é inferência de comportamento observado.

## Outros riscos aceitos

- **Número da agência, nunca pessoal.**
- **Sessão perdida**: se o volume `/evolution/instances` sumir, é repareamento
  por QR — 30 segundos.
- **`@lid`**: o WhatsApp pode entregar JID sem telefone. A conversa é gravada
  com o `remote_jid` original e telefone vazio; não bloqueia a ingestão, mas
  aquela conversa não casa com projeto por telefone.
- **Mídia**: mensagens de mídia entram no histórico como marcador (`📷 Imagem`).
  A rota de download existe (`/whatsapp/messages/:id/media`) e busca da
  Evolution sob demanda — nada de binário fica em repouso no TENKA. A inbox
  ainda não tem visualizador; é a próxima gordura a cortar se fizer falta.
