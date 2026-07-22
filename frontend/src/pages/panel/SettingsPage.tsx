import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../features/auth/AuthContext';
import { useToast } from '../../features/panel/ToastContext';
import { getSupabase } from '../../lib/supabase/client';
import { initials } from '../../features/panel/format';

const nameSchema = z.object({
  name: z.string().trim().min(2, 'O nome precisa de pelo menos 2 caracteres.'),
});
type NameForm = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    password: z.string().min(8, 'A nova senha precisa de no mínimo 8 caracteres.'),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    path: ['confirm'],
    message: 'As senhas não coincidem.',
  });
type PasswordForm = z.infer<typeof passwordSchema>;

/** Configurações da conta: nome de exibição e troca de senha. */
export default function SettingsPage() {
  const { profile, session, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const nameForm = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    values: { name: profile?.name ?? '' },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  });

  const saveName = nameForm.handleSubmit(async ({ name }) => {
    if (!profile) return;
    setSavingName(true);
    try {
      const { error } = await getSupabase()
        .from('profiles')
        .update({ name })
        .eq('id', profile.id);
      if (error) throw new Error(error.message);
      await refreshProfile();
      toast('success', 'Nome atualizado.');
    } catch {
      toast('error', 'Não foi possível salvar o nome. Tente novamente.');
    } finally {
      setSavingName(false);
    }
  });

  const savePassword = passwordForm.handleSubmit(async ({ password }) => {
    setSavingPassword(true);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw new Error(error.message);
      passwordForm.reset();
      toast('success', 'Senha alterada com sucesso.');
    } catch {
      toast('error', 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setSavingPassword(false);
    }
  });

  return (
    <div style={{ maxWidth: 560, width: '100%', margin: '0 auto' }}>
      <header style={{ marginBottom: 26 }}>
        <p className="panel-eyebrow" style={{ marginBottom: 10 }}>
          Conta
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Configurações</h1>
      </header>

      <section
        aria-labelledby="settings-profile"
        style={{
          border: '1px solid var(--panel-line)',
          borderRadius: 16,
          background: 'var(--panel-surface)',
          padding: 24,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <span className="panel-avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
            {initials(profile?.name ?? '?')}
          </span>
          <div>
            <h2 id="settings-profile" style={{ fontSize: 16, fontWeight: 700 }}>
              Perfil
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--panel-text-faint)' }}>
              {profile?.email ?? session?.user.email ?? ''}
            </p>
          </div>
        </div>

        <form onSubmit={saveName} noValidate style={{ display: 'grid', gap: 14 }}>
          <div className="panel-field">
            <label htmlFor="settings-name">Nome de exibição</label>
            <input
              id="settings-name"
              className="panel-input"
              {...nameForm.register('name')}
            />
            {nameForm.formState.errors.name && (
              <p className="panel-field__error">{nameForm.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <button type="submit" className="panel-btn" disabled={savingName}>
              {savingName ? 'Salvando…' : 'Salvar nome'}
            </button>
          </div>
        </form>
      </section>

      <section
        aria-labelledby="settings-password"
        style={{
          border: '1px solid var(--panel-line)',
          borderRadius: 16,
          background: 'var(--panel-surface)',
          padding: 24,
        }}
      >
        <h2 id="settings-password" style={{ fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
          Alterar senha
        </h2>
        <form onSubmit={savePassword} noValidate style={{ display: 'grid', gap: 14 }}>
          <div className="panel-field">
            <label htmlFor="settings-new-password">Nova senha</label>
            <input
              id="settings-new-password"
              type="password"
              autoComplete="new-password"
              className="panel-input"
              {...passwordForm.register('password')}
            />
            {passwordForm.formState.errors.password && (
              <p className="panel-field__error">
                {passwordForm.formState.errors.password.message}
              </p>
            )}
          </div>
          <div className="panel-field">
            <label htmlFor="settings-confirm-password">Confirmar nova senha</label>
            <input
              id="settings-confirm-password"
              type="password"
              autoComplete="new-password"
              className="panel-input"
              {...passwordForm.register('confirm')}
            />
            {passwordForm.formState.errors.confirm && (
              <p className="panel-field__error">
                {passwordForm.formState.errors.confirm.message}
              </p>
            )}
          </div>
          <div>
            <button type="submit" className="panel-btn" disabled={savingPassword}>
              {savingPassword ? 'Alterando…' : 'Alterar senha'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
