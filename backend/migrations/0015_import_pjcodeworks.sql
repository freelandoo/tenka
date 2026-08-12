-- ============================================================================
-- TENKA Backend — 0015: importação da carteira do PJ Codeworks
--
-- Origem: PJ-Codeworks-Export-2026-08-07.xlsx (extração de 07/08/2026 do banco
-- de produção do PJ Codeworks). Traz para o painel o que a TENKA modela hoje:
--
--   Clientes (aba Clientes)      -> public.clients
--   Projetos (aba Projetos)      -> public.projects (company = 'pjcodeworks')
--   Assinaturas ativas           -> projects.monthly_fee_cents / subscription_active / due_day
--   Despesas + recorrentes       -> public.costs (empresa) e infraestrutura (projeto)
--   Pagamentos (parcelas)        -> project_notes canal 'interna' (ver nota abaixo)
--
-- PAGAMENTOS: o painel não tem tabela de parcelas/recebimentos. As 50 linhas da
-- aba Pagamentos viram um EXTRATO em observação interna do projeto — nada se
-- perde e nenhum indicador é inflado por dado que o modelo não sabe somar. Se a
-- cobrança parcelada virar recurso do painel, a fonte está preservada ali.
--
-- DESPESAS GERADAS: as 6 despesas marcadas "Gerada por recorrente" (Claude e
-- Codex de jun/jul/ago) NÃO entram. O custo 'mensal' da TENKA já É a regra que
-- se repete todo mês; lançar também cada ocorrência dobraria o custo fixo em
-- `sumActiveCosts` e em `custoFixo + custoVariavel` da aba Equipe.
--
-- IDEMPOTÊNCIA: nada é sobrescrito. Cliente que já existe (por e-mail, pelos 8
-- últimos dígitos do telefone ou pelo nome) é reaproveitado e só tem campo
-- VAZIO preenchido. Projeto com o mesmo nome já cadastrado é ignorado. Rodar de
-- novo num banco já importado não duplica nada.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. CLIENTES
-- ---------------------------------------------------------------------------
create temp table _imp_clients (
  src_id     uuid primary key,
  name       text not null,
  email      text not null,
  phone      text not null,
  notes      text not null,
  archive    boolean not null,
  created_at timestamptz not null,
  client_id  uuid
) on commit drop;

insert into _imp_clients (src_id, name, email, phone, notes, archive, created_at) values
  ('07c6574b-e8d8-44e1-bf5e-658783992bd7', 'André Marcolino - Empresa', 'marcolinodsgn@gmail.com', '11 998893141',
   'Responsável: André Marcolino
Segmento: Diversos segmentos
Cobrança até 07/08/2026: recebido R$ 7.299,90 · a receber R$ 3.499,50 · VENCIDO R$ 599,80
Importado do PJ Codeworks em 07/08/2026.', false, '2026-06-29T00:46:07'),
  ('bd68fc57-ad32-47da-9883-cb92dac319c5', 'Gurgel Clean', 'gurgelcleanestofados@gmail.com', '31 8617-9478',
   'Responsável: Marta Pereira
Segmento: Diversos segmentos
Endereço: Rua José Andrada Costa, Coqueiros · Belo Horizonte - MG · 30881-050
Cobrança até 07/08/2026: recebido R$ 999,80 · a receber R$ 149,90
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-11T16:56:43'),
  ('b7c0b403-29c5-427c-b467-e4e0669a2c33', '847 Vidros e Esquadrias', '874vidros@gmail.com', '8788549560',
   'Responsável: Marcos Paulo dos Santos
Segmento: Diversos segmentos
Endereço: Rua Imperial, Vila Eduardo · Petrolina - PE · 56328-100
Cobrança até 07/08/2026: recebido R$ 819,79 · a receber R$ 59,90
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-10T13:16:57'),
  ('a594cc2f-6c25-4b5b-ad5a-63f9f37e7799', 'Coliseu Team', '', '',
   'Responsável: Sergio
Segmento: Fitness
Endereço: Rua General Osório, Centro · São Bernardo do Campo - SP · 09715-380
Cobrança até 07/08/2026: recebido R$ 750,00 · a receber R$ 2.850,00 · VENCIDO R$ 2.000,00
Importado do PJ Codeworks em 07/08/2026.', false, '2026-06-29T00:01:11'),
  ('1a4b20d2-d6ce-44d7-b647-1ae712c942b6', 'Cida Herpio - Estética e Bem Estar', 'aparecidaherpio@gmail.com', '27 99938-6514',
   'Responsável: Cida Hérpio
Segmento: Saúde
Endereço: R. Dr. Silva Melo, 106 - Sala 13, São Judas Tadeu · Guarapari - ES · 29200-645
Cobrança até 07/08/2026: recebido R$ 179,90 · a receber R$ 339,90
Importado do PJ Codeworks em 07/08/2026.', false, '2026-06-28T12:12:24'),
  ('02ec04b2-c0da-45fb-a80c-0f1f92dd784d', 'Engenharia Jamile', 'Jamilevitoriasilvac@gmail.com', '11 91398-7303',
   'Responsável: Jamile
Segmento: Diversos segmentos
Cobrança até 07/08/2026: a receber R$ 999,80 · VENCIDO R$ 849,90
Importado do PJ Codeworks em 07/08/2026.', false, '2026-06-29T00:25:04'),
  ('7509272a-763b-418a-93e8-a9d5b4385f53', 'Hokage Barber', 'jeffdraper097@gmail.com', '11961461809',
   'Responsável: Jefferson
Segmento: Barbearia
Endereço: Rua Zurique, Batistini · São Bernardo do Campo - SP · 09847-100
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-08T17:22:29'),
  ('e9588a62-99a7-42f8-a156-aae7ebeb3511', 'Joao Tester', 'contato.retrostreet@gmail.com', '+5511984274134',
   'Responsável: Joao Tester
Endereço: Rua Pais Leme, 215, Pinheiros · 05424-150
Arquivado na importação: registro de teste do checkout Stripe.
Importado do PJ Codeworks em 07/08/2026.', true, '2026-05-02T02:21:08'),
  ('c0000001-0000-4000-8000-000000000002', 'Link&Line', '', '',
   'Responsável: Marcelo
Segmento: Segurança e infraestrutura
Endereço: São Bernardo do Campo - SP
Acesso: Conta pessoal do João e antigamente estava no V0 / contato_victorjoao
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-19T19:17:27'),
  ('c0000001-0000-4000-8000-000000000003', 'MV Laura Cruz', '', '',
   'Responsável: Laura
Segmento: Clínica veterinária
Endereço: São Bernardo do Campo - SP
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-19T19:17:27'),
  ('12bdfdb9-6660-4b4d-af46-b3949a69438d', 'PJ Codeworks', 'pjcodeworks@gmail.com', '11987309724',
   'Responsável: João / Persio
Slug: meunegocio
Arquivado na importação: a própria agência de origem (não é cliente).
Importado do PJ Codeworks em 07/08/2026.', true, '2026-03-05T23:57:20'),
  ('c0000001-0000-4000-8000-000000000005', 'Technofy', '', '',
   'Segmento: Assistência técnica de informática
Endereço: São Bernardo do Campo - SP
Importado do PJ Codeworks em 07/08/2026.', false, '2026-03-19T19:17:27');

-- Casa com quem já está no painel, na ordem de confiança da chave. Só entram
-- clientes ATIVOS: absorver um arquivado deixaria o importado invisível.
update _imp_clients i set client_id = c.id
  from public.clients c
 where c.archived_at is null
   and i.email <> '' and lower(c.email) = lower(i.email);

update _imp_clients i set client_id = c.id
  from public.clients c
 where c.archived_at is null and i.client_id is null
   and length(regexp_replace(i.phone, '\D', '', 'g')) >= 8
   and right(regexp_replace(c.phone, '\D', '', 'g'), 8)
     = right(regexp_replace(i.phone, '\D', '', 'g'), 8);

update _imp_clients i set client_id = c.id
  from public.clients c
 where c.archived_at is null and i.client_id is null
   and lower(trim(c.name)) = lower(trim(i.name));

-- Quem não casou nasce com o id da origem: reimportar não gera cliente novo.
update _imp_clients set client_id = src_id where client_id is null;

insert into public.clients (id, name, email, phone, notes, created_at, archived_at)
select i.client_id, i.name, i.email, i.phone, i.notes, i.created_at,
       case when i.archive then now() end
  from _imp_clients i
 where not exists (select 1 from public.clients c where c.id = i.client_id)
   -- não colide com o índice parcial clients_email_uniq
   and (i.email = '' or not exists (
         select 1 from public.clients c where lower(c.email) = lower(i.email)));

-- Cliente que já existia: só completa buraco e anexa a ficha da origem.
update public.clients c
   set email = case when c.email = '' and not exists (
                      select 1 from public.clients o
                       where o.id <> c.id and lower(o.email) = lower(i.email))
                    then i.email else c.email end,
       phone = case when c.phone = '' then i.phone else c.phone end,
       notes = case when trim(c.notes) = '' then i.notes
                    else c.notes || E'\n\n' || i.notes end
  from _imp_clients i
 where c.id = i.client_id
   and c.notes not like '%Importado do PJ Codeworks em 07/08/2026.%';


-- ---------------------------------------------------------------------------
-- 2. PROJETOS + MENSALIDADE
--
-- `due_date` (entrega) segue a cascata conclusão -> previsão -> início -> data
-- de cadastro, porque a coluna é NOT NULL e é ela que a Carteira usa para
-- reconhecer a receita do projeto no mês.
-- `due_day` é o dia do mês da mensalidade — vem de assinaturas.dia_vencimento.
-- ---------------------------------------------------------------------------
create temp table _imp_projects (
  src_id            uuid primary key,
  client_src        uuid not null,
  name              text not null,
  description       text not null,
  value_cents       bigint not null,
  monthly_fee_cents bigint not null,
  subscription_active boolean not null,
  due_day           smallint,
  due_date          date not null,
  status            text not null,
  finalized_at      timestamptz,
  color_key         text not null,
  created_at        timestamptz not null,
  archive           boolean not null,
  ledger            text,
  project_id        uuid
) on commit drop;

insert into _imp_projects (src_id, client_src, name, description, value_cents,
                           monthly_fee_cents, subscription_active, due_day,
                           due_date, status, finalized_at, color_key,
                           created_at, archive, ledger) values
  ('4a552c87-df68-4b5b-9e38-f9a6acbd34d9', 'b7c0b403-29c5-427c-b467-e4e0669a2c33', '847 Vidros',
   'Tipo: Landing page
Mensalidade: Plano de Infraestrutura — R$ 59,90/mês, vence dia 10 (desde 17/05/2026).
Valor contratado derivado das parcelas (o campo estava vazio na origem).',
   70000, 5990, true, 10, '2026-03-26', 'finalizado',
   '2026-03-26T00:00:00', 'verde', '2026-03-10T13:19:09', false,
   null),
  ('b2b44ff1-75ef-4028-8af7-2106aad17694', '07c6574b-e8d8-44e1-bf5e-658783992bd7', 'Braslar',
   'Tipo: Sistema
Mensalidade: 🔧 Plano de Crescimento — R$ 299,90/mês, vence dia 10 (desde 01/03/2026).',
   300000, 29990, true, 10, '2026-03-28', 'finalizado',
   '2026-03-28T00:00:00', 'amarelo', '2026-06-29T17:06:56', false,
   'Extrato de cobrança — Braslar (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 1.000,00 — Pago (parcela 1/3) · vence 29/03/2026 · pago em 29/03/2026 · Pix
• R$ 1.000,00 — Pago (parcela 2/3) · vence 21/07/2026 · pago em 20/07/2026 · Pix
• R$ 1.000,00 — Em aberto (parcela 3/3) · vence 21/08/2026 · Pix

Totais: Em aberto R$ 1.000,00 · Pago R$ 2.000,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('d8fb6547-1616-4dbe-a92c-292c2f000176', '07c6574b-e8d8-44e1-bf5e-658783992bd7', 'Geral 1914',
   'Tipo: Sistema
Mensalidade: 🔧 Plano de Crescimento — R$ 299,90/mês, vence dia 10 (desde 28/03/2026).',
   300000, 29990, true, 10, '2026-03-28', 'finalizado',
   '2026-03-28T00:00:00', 'amarelo', '2026-06-29T17:12:50', false,
   'Extrato de cobrança — Geral 1914 (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 1.000,00 — Pago (parcela 1/3) · vence 29/03/2026 · pago em 29/03/2026 · Pix
• R$ 1.000,00 — Pago (parcela 2/3) · vence 29/04/2026 · pago em 29/04/2026 · Pix
• R$ 1.000,00 — Pago (parcela 3/3) · vence 21/07/2026 · pago em 20/07/2026 · Pix

Totais: Pago R$ 3.000,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('92b85105-7e17-4f4e-a3f3-2d5c7b3383d2', '07c6574b-e8d8-44e1-bf5e-658783992bd7', 'Refribras',
   'Tipo: Sistema
Mensalidade: 🔧 Plano de Crescimento — R$ 299,90/mês, vence dia 10 (desde 01/03/2026).',
   300000, 29990, true, 10, '2026-03-28', 'finalizado',
   '2026-03-28T00:00:00', 'amarelo', '2026-06-29T17:09:55', false,
   'Extrato de cobrança — Refribras (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 1.000,00 — Pago (parcela 1/3) · vence 28/03/2026 · pago em 29/03/2026 · Pix
• R$ 1.000,00 — Pago (parcela 2/3) · vence 29/04/2026 · pago em 29/04/2026 · Pix
• R$ 1.000,00 — Em aberto (parcela 3/3) · vence 21/08/2026 · Pix

Totais: Em aberto R$ 1.000,00 · Pago R$ 2.000,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('fe7bb536-db61-492d-a3ec-4b1bbd48d288', '1a4b20d2-d6ce-44d7-b647-1ae712c942b6', 'Cida',
   'Tipo: Landing page
Mensalidade: Plano de Infraestrutura — R$ 59,90/mês, vence dia 10 (desde 23/06/2026).',
   40000, 5990, true, 10, '2026-07-02', 'finalizado',
   '2026-06-28T20:03:40', 'laranja', '2026-06-28T20:03:40', false,
   'Extrato de cobrança — Cida (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 120,00 — Pago (entrada, parcela 0) · sem vencimento · pago em 23/06/2026 · pix
• R$ 46,67 — Em aberto (parcela 2/6) · vence 10/08/2026 · credito
• R$ 46,67 — Em aberto (parcela 3/6) · vence 10/09/2026 · credito
• R$ 46,67 — Em aberto (parcela 4/6) · vence 10/10/2026 · credito
• R$ 46,66 — Em aberto (parcela 5/6) · vence 10/11/2026 · credito
• R$ 46,66 — Em aberto (parcela 6/6) · vence 10/12/2026 · credito
• R$ 46,67 — Em aberto (parcela 1/6) · vence 10/01/2027 · credito

Totais: Em aberto R$ 280,00 · Pago R$ 120,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('0f45890e-df66-44af-9e2e-452ed787a580', 'a594cc2f-6c25-4b5b-ad5a-63f9f37e7799', 'Coliseu CRM',
   'Tipo: Sistema',
   360000, 0, false, null, '2026-10-16', 'em_andamento',
   null, 'rosa', '2026-06-29T00:33:08', false,
   'Extrato de cobrança — Coliseu CRM (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 750,00 — Pago (entrada, parcela 0) · sem vencimento · pago em 14/06/2026 · pix
• R$ 750,00 — Vencido (parcela 1/3) · vence 05/07/2026
• R$ 1.250,00 — Vencido (parcela 2/3) · vence 05/08/2026
• R$ 850,00 — Em aberto (parcela 3/3) · vence 05/09/2026

Totais: Em aberto R$ 850,00 · Pago R$ 750,00 · Vencido R$ 2.000,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('3a77986b-0ae1-4bab-83ec-45aed36bc4b5', '02ec04b2-c0da-45fb-a80c-0f1f92dd784d', 'Engenharia Jamile - Site',
   'Tipo: Site
Mensalidade: 🔧 Plano de Suporte — R$ 149,90/mês, vence dia 10 (desde 07/06/2026).
Status na origem: aguardando cliente.',
   75000, 14990, true, 10, '2026-06-19', 'em_andamento',
   null, 'roxo', '2026-06-29T18:08:26', false,
   'Extrato de cobrança — Engenharia Jamile - Site (importado do PJ Codeworks, posição de 07/08/2026)

• R$ 700,00 — Vencido (investimento, parcela 1) · vence 10/07/2026 · outro

Totais: Vencido R$ 700,00
Migrado como observação interna: o painel ainda não tem tabela de parcelas.'),
  ('f945d5d7-5102-48bc-a69e-f2e3d4dc77dd', 'bd68fc57-ad32-47da-9883-cb92dac319c5', 'Gurgel Clean',
   'Tipo: Landing page
2. ESCOPO DO PROJETO
• Criação de site estratégico otimizado para uma cidade
• Estrutura de página focada em conversão
• Botão de contato direto via WhatsApp
• Otimização básica para Google (SEO inicial)
• Estrutura pensada para captação de clientes
3. PRAZO DE ENTREGA
O prazo estimado para desenvolvimento do site é de até 15 (quinze) dias, contados a partir
da confirmação da contratação, pagamento da entrada e envio das informações necessárias
pelo contratante.
Caso haja atraso no envio das informações pelo cliente, o prazo poderá ser ajustado.
Mensalidade: 🔧 Plano de Suporte — R$ 149,90/mês, vence dia 10 (desde 17/05/2026).
Valor contratado derivado das parcelas (o campo estava vazio na origem).',
   70000, 14990, true, 10, '2026-04-01', 'finalizado',
   '2026-04-01T00:00:00', 'azul', '2026-03-11T16:59:25', false,
   null),
  ('87b275ca-0c5b-4848-a15d-ad6f459c7255', '7509272a-763b-418a-93e8-a9d5b4385f53', 'Hokage Barber 1.0',
   'Tipo: Landing page',
   0, 0, false, null, '2025-12-01', 'finalizado',
   '2026-03-08T18:16:33', 'ciano', '2026-03-08T18:16:33', false,
   null),
  ('abd2acbf-c693-42c2-a8ee-1617161c34fb', '7509272a-763b-418a-93e8-a9d5b4385f53', 'Hokage Barber Barbearia - Plataforma',
   '',
   0, 0, false, null, '2026-03-11', 'finalizado',
   '2026-03-08T17:51:38', 'ciano', '2026-03-08T17:51:38', false,
   null),
  ('5f2c11ee-3c97-4681-a89a-7e201843af2d', '7509272a-763b-418a-93e8-a9d5b4385f53', 'Jefferson - Pessoal',
   'Tipo: Landing page',
   0, 0, false, null, '2026-02-20', 'finalizado',
   '2026-03-08T18:19:52', 'ciano', '2026-03-08T18:19:52', false,
   null),
  ('73fac451-23f0-492a-a54d-798f29c3bcf0', 'e9588a62-99a7-42f8-a156-aae7ebeb3511', 'Site — Joao Tester',
   'Projeto criado automaticamente após confirmação de pagamento (Stripe).',
   0, 0, false, null, '2026-05-02', 'finalizado',
   '2026-05-02T02:21:08', 'coral', '2026-05-02T02:21:08', true,
   null),
  ('e0000001-0000-4000-8000-000000000001', 'c0000001-0000-4000-8000-000000000002', 'Site Link&Line',
   'Tipo: Site institucional',
   0, 0, false, null, '2026-07-22', 'finalizado',
   '2026-07-22T00:00:00', 'amarelo', '2026-03-19T19:17:54', false,
   null),
  ('e0000001-0000-4000-8000-000000000006', 'c0000001-0000-4000-8000-000000000003', 'Site MV Laura Cruz',
   'Tipo: Site institucional',
   0, 0, false, null, '2026-03-19', 'finalizado',
   '2026-03-19T19:17:54', 'azul', '2026-03-19T19:17:54', false,
   null),
  ('e0000001-0000-4000-8000-000000000003', 'c0000001-0000-4000-8000-000000000005', 'Site Technofy',
   'Tipo: Site institucional',
   0, 0, false, null, '2026-03-19', 'finalizado',
   '2026-03-19T19:17:54', 'rosa', '2026-03-19T19:17:54', false,
   null);

-- Projeto de mesmo nome já cadastrado é o mesmo projeto: não duplica.
update _imp_projects i set project_id = p.id
  from public.projects p
 where p.archived_at is null and lower(trim(p.name)) = lower(trim(i.name));

update _imp_projects set project_id = src_id where project_id is null;

-- Board = não finalizados. Os dois projetos em andamento entram no fim da
-- coluna "em_andamento"; os finalizados vão direto para o histórico.
insert into public.projects
  (id, name, description, value_cents, monthly_fee_cents, subscription_active,
   due_date, due_day, status, color_key, position, client_id, company,
   client_name, client_phone, client_email,
   created_at, finalized_at, archived_at)
select i.project_id, i.name, i.description, i.value_cents,
       i.monthly_fee_cents, i.subscription_active,
       i.due_date, i.due_day, i.status, i.color_key,
       case when i.status = 'finalizado' then 0
            else (select coalesce(max(p.position) + 1, 0) from public.projects p
                   where p.status = i.status and p.archived_at is null
                     and p.finalized_at is null)
                 + (row_number() over (partition by i.status order by i.created_at) - 1)::int
       end,
       c.client_id, 'pjcodeworks',
       c.name, c.phone, c.email,
       i.created_at, i.finalized_at,
       case when i.archive then now() end
  from _imp_projects i
  join _imp_clients c on c.src_id = i.client_src
 where not exists (select 1 from public.projects p where p.id = i.project_id);

-- Projeto que já existia no painel: liga ao cliente e à mensalidade se ainda
-- não tiver. Valor, nome e status ficam como o painel já os tem.
update public.projects p
   set client_id = coalesce(p.client_id, c.client_id),
       due_day   = coalesce(p.due_day, i.due_day),
       monthly_fee_cents = case when p.monthly_fee_cents = 0
                                then i.monthly_fee_cents else p.monthly_fee_cents end,
       subscription_active = case when p.monthly_fee_cents = 0
                                  then i.subscription_active else p.subscription_active end
  from _imp_projects i
  join _imp_clients c on c.src_id = i.client_src
 where p.id = i.project_id
   and p.id <> i.src_id;


-- ---------------------------------------------------------------------------
-- 3. CUSTOS
--
-- Empresa (`project_id` null): as duas recorrentes ativas como 'mensal' e as
-- duas despesas avulsas como 'unico'. Infraestrutura vira custo do projeto.
-- ---------------------------------------------------------------------------
create temp table _imp_costs (
  description  text not null,
  amount_cents bigint not null,
  kind         text not null,
  incurred_on  date not null,
  project_name text
) on commit drop;

insert into _imp_costs (description, amount_cents, kind, incurred_on, project_name) values
  ('Claude (IA)', 9990, 'mensal', '2026-06-01', null),
  ('Codex (Claude)', 9990, 'mensal', '2026-06-01', null),
  ('Cursor IA (IA) — Paguei para o persio o valor de 100 e ele passou pelo cartão dele', 10000, 'unico', '2026-03-01', null),
  ('Meta Ads (Anuncios)', 75054, 'unico', '2026-02-28', null),
  ('Vercel — vercel (gratuito)', 0, 'mensal', '2026-03-11', 'Gurgel Clean');

insert into public.costs (project_id, description, amount_cents, kind, incurred_on, active)
select p.id, i.description, i.amount_cents, i.kind, i.incurred_on, true
  from _imp_costs i
  left join _imp_projects ip on ip.name = i.project_name
  left join public.projects p on p.id = ip.project_id
 where not exists (
         select 1 from public.costs c
          where c.description = i.description
            and c.incurred_on = i.incurred_on
            and c.project_id is not distinct from p.id);


-- ---------------------------------------------------------------------------
-- 4. EXTRATO DE COBRANÇA -> observação interna
--
-- Canal 'interna': fica só no painel, não dispara envio. É onde as parcelas da
-- aba Pagamentos ficam legíveis até existir uma tabela própria para elas.
-- ---------------------------------------------------------------------------
insert into public.project_notes (project_id, author_id, body, channel)
select i.project_id, null, i.ledger, 'interna'
  from _imp_projects i
 where i.ledger is not null
   and exists (select 1 from public.projects p where p.id = i.project_id)
   and not exists (
         select 1 from public.project_notes n
          where n.project_id = i.project_id
            and n.body like 'Extrato de cobrança — %importado do PJ Codeworks%');
