import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { useNoindex } from '../seo/useSeo';
import TabloidHeader from '../tabloid/TabloidHeader';
import { acceptInvite, fetchInvite } from '../store/portalApi';
import '../tabloid/tabloid.css';
import '../pricing/precos.css';
import '../store/store.css';

/**
 * `/loja/convite/:token` — quem comprou define a senha do portal do cliente e
 * já entra. O link sai da página do pedido (o back não manda e-mail) ou pelo
 * WhatsApp da equipe. noindex, sem referrer.
 */
export default function LojaConvitePage() {
  useNoindex();
  useGoogleFonts('family=Archivo:wdth,wght@62..125,400..900&family=Space+Mono:wght@400;700');
  const { token = '' } = useParams();
  const [invite, setInvite] = useState<{ email: string; name: string } | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'Acesso ao portal — TENKA';
    void fetchInvite(token).then(setInvite);
  }, [token]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password') ?? '');
    if (password.length < 8) return setError('A senha precisa de pelo menos 8 caracteres.');
    if (password !== String(form.get('confirm') ?? '')) return setError('As duas senhas não são iguais.');
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(token, password);
      window.location.assign('/painel');
    } catch {
      setBusy(false);
      setError('Não deu para criar o acesso. O convite pode ter vencido — fale com a gente pelo WhatsApp.');
    }
  }

  return (
    <div className="tf-root pc lj" data-division="tech">
      <TabloidHeader current="/loja" />
      <section className="lj-hero lj-order">
        <span className="tf-ribbon">Portal do cliente</span>
        {invite === undefined && <p className="lj-hero__lead">Conferindo o convite…</p>}
        {invite === null && (
          <p className="lj-hero__lead">
            Este convite não vale mais (já foi usado ou venceu). Se você já criou a senha,{' '}
            <Link to="/painel/login">entre no portal</Link>.
          </p>
        )}
        {invite && (
          <>
            <h1 className="tf-display lj-order__title">
              <span className="tf-grunge">Crie o seu</span> <span className="tf-grunge tf-grunge-acc">acesso.</span>
            </h1>
            <p className="lj-hero__lead">
              Olá, {invite.name.split(' ')[0]}! No portal você acompanha o seu projeto, os pedidos e as assinaturas.
            </p>
            <form className="lj-cart__form lj-invite" onSubmit={submit}>
              <label>
                <span className="tf-mono">E-mail (seu login)</span>
                <input value={invite.email} readOnly autoComplete="username" />
              </label>
              <label>
                <span className="tf-mono">Senha</span>
                <input name="password" type="password" minLength={8} required autoComplete="new-password" />
              </label>
              <label>
                <span className="tf-mono">Repita a senha</span>
                <input name="confirm" type="password" minLength={8} required autoComplete="new-password" />
              </label>
              {error && <p className="lj-cart__error" role="alert">{error}</p>}
              <button className="tf-btn lj-cart__pay" type="submit" disabled={busy}>
                {busy ? 'Criando…' : 'Criar acesso e entrar'}
                <span className="tf-arrow" aria-hidden="true">↗</span>
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
