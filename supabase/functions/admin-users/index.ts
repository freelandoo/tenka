// ============================================================================
// TENKA Painel — Edge Function `admin-users`
//
// Única superfície autorizada a usar a SERVICE ROLE KEY. Roda exclusivamente
// no ambiente do Supabase (Deno) — a chave nunca chega ao navegador.
//
// Ações (POST { action, ... }):
//   create_user { email, password, name, role? }  → cria usuário confirmado
//   invite_user { email, name, role? }            → envia convite por e-mail
//
// Toda chamada exige um JWT válido de um ADMIN ATIVO (validado contra a
// tabela profiles antes de qualquer operação privilegiada).
//
// Deploy: supabase functions deploy admin-users
// ============================================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // 1. Identifica o solicitante pelo JWT do header Authorization.
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return json({ error: 'Não autenticado.' }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const {
    data: { user: caller },
    error: callerError,
  } = await userClient.auth.getUser();
  if (callerError || !caller) return json({ error: 'Sessão inválida.' }, 401);

  // 2. Confirma que o solicitante é um administrador ativo.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', caller.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'admin' || !callerProfile.active) {
    return json({ error: 'Somente administradores podem gerenciar usuários.' }, 403);
  }

  // 3. Executa a ação solicitada.
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const action = String(payload.action ?? '');
  const email = String(payload.email ?? '').trim().toLowerCase();
  const name = String(payload.name ?? '').trim();
  const role = payload.role === 'admin' ? 'admin' : 'collaborator';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'E-mail inválido.' }, 400);
  }
  if (!name) return json({ error: 'Nome é obrigatório.' }, 400);

  try {
    if (action === 'create_user') {
      const password = String(payload.password ?? '');
      if (password.length < 8) {
        return json({ error: 'A senha deve ter no mínimo 8 caracteres.' }, 400);
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) return json({ error: error.message }, 400);

      // O trigger handle_new_user cria o profile como collaborator;
      // ajusta nome/role com a service role (bypassa RLS).
      await admin.from('profiles').update({ name, role }).eq('id', data.user.id);
      return json({ ok: true, user_id: data.user.id });
    }

    if (action === 'invite_user') {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { name },
      });
      if (error) return json({ error: error.message }, 400);
      await admin.from('profiles').update({ name, role }).eq('id', data.user.id);
      return json({ ok: true, user_id: data.user.id });
    }

    return json({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err) {
    console.error('[admin-users]', err);
    return json({ error: 'Erro interno ao processar a solicitação.' }, 500);
  }
});
