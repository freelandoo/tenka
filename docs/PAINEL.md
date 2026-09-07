# TENKA Painel — área interna de projetos

Módulo interno da TENKA: autenticação, Kanban de projetos em post-its,
observações, notificações, histórico de atividades e gerenciamento de
usuários. Carregado de forma independente (lazy) — as experiências públicas
(Home, Games, Multimídia, Desenvolvimento) não pagam nada por ele.

## Rotas

O painel tem três superfícies, decididas pelo papel da conta:

| Rota                          | Conteúdo                                  | Proteção          |
| ----------------------------- | ----------------------------------------- | ----------------- |
| `/painel/login`               | Tela de login                             | pública (redireciona logados) |
| `/painel`                     | Redireciona para a home do papel          | autenticado       |
| `/painel/visao-geral`         | Portal: resumo da conta do cliente        | **cliente**       |
| `/painel/meus-projetos`       | Portal: projetos e cobranças do cliente   | **cliente**       |
| `/painel/suporte`             | Portal: canais de contato                 | **cliente**       |
| `/painel/projetos`            | Kanban, diárias, carteira, leads, equipe  | **equipe/admin**  |
| `/painel/atendimento`         | Inbox do WhatsApp                         | **administrador** |
| `/painel/configuracoes`       | Conta (nome, senha)                       | autenticado       |
| `/painel/admin`               | Administração — visão geral               | **administrador** |
| `/painel/admin/clientes`      | Clientes                                  | **administrador** |
| `/painel/admin/usuarios`      | Usuários, funções e vínculos              | **administrador** |
| `/painel/admin/financeiro`    | Carteira / financeiro                     | **administrador** |
| `/painel/admin/site`          | Hero da home do site                      | **administrador** |
| `/painel/admin/configuracoes` | Integrações e referência de papéis        | **administrador** |

A antiga área pública `/admin` (com item "Admin" no menu hambúrguer do site)
**não existe mais**: virou `/painel/admin`, e `/admin/*` redireciona para lá.
O editor do hero, que era `/admin/hero` sem autenticação nenhuma, é hoje
`/painel/admin/site`.

## 0. Ambiente local com Docker (recomendado para testar)

Não precisa de conta no Supabase: o CLI (já em devDependencies) sobe o stack
completo — Postgres, Auth, API e Studio — em containers, aplicando as
migrations de `supabase/migrations/` automaticamente.

```bash
# Docker Desktop precisa estar rodando
npx supabase start      # primeira vez baixa as imagens (alguns minutos)
npm run dev             # leia a porta no output (5173 pode estar ocupada)
```

O `.env.local` deve apontar para o stack local (chaves públicas padrão do
CLI, iguais em qualquer máquina — nunca usar em produção):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<ANON_KEY exibida por `npx supabase status`>
```

Úteis: Studio em http://127.0.0.1:54323 (tabelas/SQL), e-mails de
recuperação caem no Mailpit em http://127.0.0.1:54324.
`npx supabase stop` desliga os containers (dados preservados);
`npx supabase db reset` reaplica migrations do zero (apaga dados).

Usuários de teste do ambiente local (criados via API admin local +
`update profiles set role='admin'`):

| Perfil        | E-mail              | Senha              |
| ------------- | ------------------- | ------------------ |
| Administrador | `admin@tenka.local` | `tenka-admin-2026` |
| Colaborador   | `colab@tenka.local` | `tenka-colab-2026` |

## 1. Configurar o Supabase (produção/hosted)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Aplique as migrations, na ordem:
   - `supabase/migrations/0001_painel_schema.sql`
   - `supabase/migrations/0002_painel_rls.sql`
   - `supabase/migrations/0003_painel_grants.sql`
   - `supabase/migrations/0004_painel_fix_cascade.sql`

   Pelo SQL Editor do Dashboard (cole e execute cada arquivo) ou via CLI:

   ```bash
   supabase link --project-ref SEU_REF
   supabase db push
   ```

3. Em **Authentication → Providers**, deixe apenas **Email** habilitado.
   Recomendado: desative **"Allow new users to sign up"** (signup público) —
   usuários são criados pelo painel, via Edge Function.
4. Publique a Edge Function de gerenciamento de usuários:

   ```bash
   supabase functions deploy admin-users
   ```

   Ela usa as variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
   `SUPABASE_SERVICE_ROLE_KEY`, injetadas automaticamente pelo Supabase no
   ambiente da função. **A service role key nunca entra no frontend.**

## 2. Variáveis de ambiente (frontend)

```bash
cp .env.example .env.local
```

| Variável                 | Onde encontrar                                  |
| ------------------------ | ----------------------------------------------- |
| `VITE_SUPABASE_URL`      | Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Dashboard → Project Settings → API → anon public |

Somente a chave **anon** (pública) vai para o navegador — a segurança real é
garantida pelas políticas RLS. Não crie variáveis `VITE_*` com a service
role key. O `.env`/`.env.local` existente nunca deve ser commitado
(`*.local` já está no `.gitignore`).

## 3. Definir o primeiro administrador

1. Crie o primeiro usuário: Dashboard → Authentication → Users →
   **Add user** (e-mail + senha, marque *Auto confirm*).
2. O trigger `handle_new_user` cria o profile como `staff`.
3. Promova-o via SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin', name = 'Seu Nome'
   where id = (select id from auth.users where email = 'voce@tenka.com.br');
   ```

A partir daí, todos os demais usuários são criados **pelo painel**
(`/painel/admin/usuarios` → "Novo usuário"), que chama a Edge Function
`admin-users` — ela valida que o solicitante é um admin ativo antes de usar
a API administrativa.

## 4. Rodar, testar, buildar

```bash
npm install
npm run dev        # desenvolvimento (http://localhost:5173/painel)
npm test           # Vitest (fluxos críticos do painel)
npm run build      # tsc -b && vite build (produção em dist/)
npm run preview    # serve o build localmente
```

## 5. Deploy

O projeto continua sendo um SPA Vite estático:

1. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente de
   build do provedor (Vercel/Netlify/Cloudflare Pages etc.).
2. `npm run build` → publique `dist/`.
3. Garanta o *fallback* de SPA (todas as rotas → `index.html`), necessário
   para `/painel/*` e para as rotas públicas.
4. No Supabase: Authentication → URL Configuration → adicione a URL do site
   (usada nos e-mails de recuperação de senha).

## 6. Modelo de permissões

Papéis (coluna `profiles.role`, migration `0017_roles.sql`):

- **`admin`** — administra a TENKA: usuários, clientes, projetos, permissões,
  financeiro e configurações globais. É quem entra em `/painel/admin`.
- **`staff`** — equipe TENKA (era `collaborator`; só o nome mudou). Vê a
  operação, com os projetos em que está atribuída.
- **`client`** — cliente. Vê **apenas a própria conta**, pelo portal. A conta
  aponta para um cliente em `profiles.client_id`, e é esse vínculo — não um
  parâmetro do front — que recorta tudo que ela lê.

| Capacidade                                   | Admin | Equipe                | Cliente |
| -------------------------------------------- | ----- | --------------------- | ------- |
| Ver todos os projetos                        | ✅    | ❌ (somente atribuídos) | ❌ (somente os seus) |
| Criar/editar/arquivar projetos               | ✅    | ❌                    | ❌ |
| Mover projetos (status/posição)              | ✅    | ✅ somente atribuídos | ❌ |
| Adicionar/remover responsáveis               | ✅    | ❌                    | ❌ |
| Ver valores (R$)                             | ✅    | ❌ (oculto na UI)     | ✅ só os do próprio contrato |
| Criar observações                            | ✅    | ✅ somente atribuídos | ❌ |
| Editar observações                           | ✅ todas | ✅ somente as próprias | ❌ |
| Ver histórico                                | ✅    | ✅ dos atribuídos     | ❌ |
| Notificações                                 | somente as próprias | somente as próprias | somente as próprias |
| Gerenciar usuários / funções                 | ✅    | ❌                    | ❌ |
| Área de Administração (`/painel/admin`)      | ✅    | ❌                    | ❌ |

### Onde o papel é aplicado (backend próprio)

Esconder o item de menu não protege nada — a autorização vive na API:

- `staffOnly` (`backend/src/auth/middleware.ts`) fecha TODA a operação:
  `/projects/*`, `/dailies/*`, `/clients/*`, `/costs/*`, `/whatsapp/*`,
  `/profiles`. Conta de cliente recebe 403 mesmo acertando a URL.
- `adminOnly` fecha o que é de administração: `/users`, `/admin/users`,
  escrita de clientes/projetos, integrações.
- `clientOnly` abre a superfície do portal (`/me/client`, `/me/projects`,
  `/me/payments`), sempre filtrada por `profiles.client_id`.
- O SSE (`/events`) só entrega eventos da operação para conta da equipe.

### Onde as regras são aplicadas

- **RLS (banco)** — `0002_painel_rls.sql`: colaborador só lê projetos em que
  está em `project_assignees`; não tem UPDATE direto em `projects`;
  notificações restritas ao dono; atividade sem INSERT de cliente.
- **RPCs SECURITY DEFINER** — `create_project` (só admin) e `move_project`
  (admin ou atribuído; recalcula posições e grava histórico numa transação).
- **Triggers de guarda** — `guard_profile_update` (não-admin não muda
  role/active; o último admin ativo nunca é rebaixado/desativado — regra
  válida até para admins e para o próprio usuário) e
  `guard_notification_update` (cliente só altera `seen_at`/`read_at`).
- **Edge Function `admin-users`** — única superfície com service role key;
  valida o JWT do solicitante contra `profiles` antes de criar usuários.
- **Guards de rota (UI)** — `RequireAuth`, `RequireAdmin`,
  `RedirectIfAuthed` em `src/features/auth/guards.tsx`. São conveniência de
  UX; a garantia real está no banco.

> Nota: `value_cents` é ocultado de colaboradores na interface, mas a linha
> do projeto (incluindo o valor) é legível por RLS para quem está atribuído.
> Se valores forem sigilosos mesmo entre atribuídos, mova-os para uma tabela
> própria com política somente-admin.

## 7. Notificações e destaque

- Trigger `on_assignee_added` cria a notificação de atribuição no banco
  (quem atribuiu, projeto, entrega) — nunca o cliente.
- `seen_at` = o modal "Você foi adicionado a um novo projeto" já foi
  apresentado ("Ver depois"); `read_at` = aberta/lida.
- "Abrir projeto" navega para `/painel/projetos` com `highlightProjectId`
  em route state; o Kanban localiza o post-it, faz scroll centralizado e
  aplica o destaque GSAP com o glow da **cor do próprio post-it**
  (`--postit-glow` em `src/styles/panel.css`). O destaque some ao interagir
  com o card (ou por tempo-limite de segurança).
- Supabase Realtime atualiza sino e board (canais encerrados no unmount).

## 8. Estrutura

```
supabase/
  migrations/           0001 schema+triggers+RPCs · 0002 RLS+realtime
  functions/admin-users # Edge Function (Deno) — service role só aqui
src/
  lib/supabase/         # cliente (anon key) + tipos do banco
  features/
    auth/               # AuthProvider, guards
    panel/              # overlay acessível, toasts, formatação
    projects/           # Kanban, post-its, drawer, notas, atividade
    notifications/      # sino, modal de atribuição, realtime
    users/              # serviço de usuários (Edge Function p/ criar)
  layouts/PanelLayout   # header, nav, sino, conta
  pages/panel/          # LoginPage, ProjectsPage, UsersPage, SettingsPage
  styles/panel.css      # identidade do painel + tokens das 8 cores
```
