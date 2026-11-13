import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarDays, CheckCircle2, CreditCard, LoaderCircle,
  LockKeyhole, ReceiptText, ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../lib/api/client';
import {
  authorizePublicCard,
  fetchPublicCardAuthorization,
  type CardAuthorizationInput,
  type PublicCardAuthorization,
} from '../features/finance/cardAuthorizationService';
import './card-authorization.css';

const FREQUENCY = {
  once: 'Cobrança única', monthly: 'Mensal', quarterly: 'Trimestral',
  semiannual: 'Semestral', annual: 'Anual',
} as const;

const money = (cents: number) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
}).format(cents / 100);

const EMPTY_FORM: Omit<CardAuthorizationInput, 'accepted' | 'termVersion'> & { accepted: boolean } = {
  verificationDocument: '', holderName: '', holderCpfCnpj: '', postalCode: '',
  addressNumber: '', cardNumber: '', expiryMonth: '', expiryYear: '', ccv: '', accepted: false,
};

export default function CardAuthorizationPage() {
  const { token = '' } = useParams();
  const [authorization, setAuthorization] = useState<PublicCardAuthorization | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState<{ brand: string; lastFour: string } | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Autorização de cobranças automáticas | TENKA';
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex,nofollow,noarchive';
    const referrer = document.createElement('meta');
    referrer.name = 'referrer'; referrer.content = 'no-referrer';
    document.head.append(robots, referrer);
    return () => { document.title = previousTitle; robots.remove(); referrer.remove(); };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void fetchPublicCardAuthorization(token)
      .then((data) => { if (active) setAuthorization(data); })
      .catch(() => { if (active) setError('Este link não está disponível. Solicite um novo link à TENKA.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const examples = useMemo(() => {
    const terms = authorization?.terms;
    if (!terms) return null;
    const monthly = terms.services.filter((item) => item.frequency === 'monthly')
      .reduce((total, item) => total + item.amountCents, 0);
    return { monthly, maximum: terms.maxCycleAmountCents };
  }, [authorization]);

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError('');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authorization || !form.accepted) {
      setError('Confirme que leu e concorda com as condições apresentadas.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const result = await authorizePublicCard(token, {
        ...form, accepted: true, termVersion: authorization.termVersion,
      });
      setSuccess(result.card);
      setForm(EMPTY_FORM);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : '';
      const messages: Record<string, string> = {
        'identidade-nao-confirmada': 'Não foi possível confirmar os dados do cliente. Revise o CPF ou CNPJ informado.',
        'cartao-nao-autorizado': 'O cartão não foi autorizado. Revise os dados ou tente outro cartão.',
        'asaas-indisponivel': 'O processamento está temporariamente indisponível. Aguarde alguns minutos e tente novamente.',
        'link-indisponivel': 'Este link expirou, foi revogado ou já foi utilizado.',
        'muitas-tentativas': 'O limite de tentativas foi atingido. Solicite um novo link à TENKA.',
        'tokenizacao-nao-configurada': 'A homologação ainda não está configurada neste ambiente.',
        'tokenizacao-producao-nao-habilitada': 'A autorização de cartão ainda não foi liberada para produção.',
      };
      setError(messages[code] ?? 'Não foi possível concluir a autorização. Nenhuma cobrança foi realizada.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <PageState icon={<LoaderCircle className="card-auth__spin" />} title="Validando seu link" text="Aguarde um instante." />;
  if (!authorization) return <PageState icon={<AlertTriangle />} title="Link indisponível" text={error} />;
  if (success) return <PageState icon={<CheckCircle2 />} title="Cartão autorizado com sucesso" text={`O cartão ${success.brand} final ${success.lastFour} foi autorizado para as condições apresentadas. Nenhuma cobrança foi feita agora.`} success />;
  if (authorization.state !== 'active') {
    const copy = {
      expired: ['Link expirado', 'Por segurança, este link não pode mais ser utilizado. Solicite um novo link à TENKA.'],
      used: ['Link já utilizado', 'Esta autorização já foi concluída. Para atualizar o cartão, solicite um novo link.'],
      revoked: ['Link revogado', 'Este link foi cancelado pela TENKA. Solicite um novo link se precisar autorizar o cartão.'],
    }[authorization.state];
    return <PageState icon={<AlertTriangle />} title={copy?.[0] ?? 'Link indisponível'} text={copy?.[1] ?? ''} />;
  }

  const disabled = !authorization.tokenizationAvailable || submitting;
  return <main className="card-auth">
    <div className="card-auth__shell">
      <header className="card-auth__brand" aria-label="TENKA">
        <img src="/images/brand/tenka-group.svg" alt="Tenka Group" />
        <span className="card-auth__secure"><ShieldCheck size={15} /> Homologação Sandbox</span>
      </header>

      <div className="card-auth__layout">
        <section className="card-auth__summary" aria-labelledby="authorization-title">
          <p className="card-auth__eyebrow">Autorização de pagamentos</p>
          <h1 id="authorization-title">Autorize suas cobranças automáticas</h1>
          <p className="card-auth__intro">Cadastre o cartão uma única vez. A TENKA cobrará somente os serviços e ciclos apresentados abaixo.</p>

          <div className="card-auth__client"><span>Cliente</span><strong>{authorization.terms.clientName}</strong></div>

          <div className="card-auth__section">
            <div className="card-auth__section-title"><ReceiptText size={18} /><h2>Serviços abrangidos</h2></div>
            <ul className="card-auth__services">
              {authorization.terms.services.map((service, index) => <li key={`${service.projectName}-${service.name}-${index}`}>
                <div><strong>{service.name}</strong><span>{service.projectName} · {FREQUENCY[service.frequency]}</span></div>
                <b>{money(service.amountCents)}</b>
              </li>)}
            </ul>
          </div>

          <div className="card-auth__rule">
            <div><CalendarDays size={17} /><span>Vencimento</span><strong>Dia {authorization.terms.dueDay}</strong></div>
            {examples && <div><CreditCard size={17} /><span>Como varia</span><strong>{money(examples.monthly)} normalmente · ate {money(examples.maximum)} quando os itens coincidirem</strong></div>}
          </div>

          <div className="card-auth__notice">
            <strong>O que você está autorizando</strong>
            <p>{authorization.terms.variableRule} {authorization.terms.priceChangeRule}</p>
          </div>
        </section>

        <section className="card-auth__form-card" aria-labelledby="card-title">
          <div className="card-auth__form-head"><span><LockKeyhole size={20} /></span><div><p>Cartão de crédito</p><h2 id="card-title">Dados para autorização</h2></div></div>
          {!authorization.tokenizationAvailable && <div className="card-auth__sandbox-warning" role="status"><AlertTriangle size={17} /><span>A tokenização Sandbox ainda não está configurada. O formulário permanece bloqueado e não aceita cartões reais.</span></div>}
          <form onSubmit={submit} noValidate autoComplete="on">
            <label>CPF ou CNPJ do cliente<input value={form.verificationDocument} onChange={(event) => set('verificationDocument', event.target.value)} inputMode="numeric" autoComplete="off" required placeholder="Usado apenas para confirmar o link" /></label>
            <label>Nome do titular<input value={form.holderName} onChange={(event) => set('holderName', event.target.value)} autoComplete="cc-name" required /></label>
            <label>CPF ou CNPJ do titular<input value={form.holderCpfCnpj} onChange={(event) => set('holderCpfCnpj', event.target.value)} inputMode="numeric" autoComplete="off" required /></label>
            <label>Número do cartão<input value={form.cardNumber} onChange={(event) => set('cardNumber', event.target.value)} inputMode="numeric" autoComplete="cc-number" required placeholder="0000 0000 0000 0000" /></label>
            <div className="card-auth__grid-3">
              <label>Mês<input value={form.expiryMonth} onChange={(event) => set('expiryMonth', event.target.value)} inputMode="numeric" autoComplete="cc-exp-month" required placeholder="MM" maxLength={2} /></label>
              <label>Ano<input value={form.expiryYear} onChange={(event) => set('expiryYear', event.target.value)} inputMode="numeric" autoComplete="cc-exp-year" required placeholder="AAAA" maxLength={4} /></label>
              <label>CVV<input value={form.ccv} onChange={(event) => set('ccv', event.target.value)} inputMode="numeric" autoComplete="cc-csc" required placeholder="000" maxLength={4} /></label>
            </div>
            <div className="card-auth__grid-2">
              <label>CEP<input value={form.postalCode} onChange={(event) => set('postalCode', event.target.value)} inputMode="numeric" autoComplete="postal-code" required /></label>
              <label>Número<input value={form.addressNumber} onChange={(event) => set('addressNumber', event.target.value)} autoComplete="address-line2" required /></label>
            </div>
            <label className="card-auth__accept"><input type="checkbox" checked={form.accepted} onChange={(event) => set('accepted', event.target.checked)} /><span>Li e autorizo as cobranças automáticas variáveis dentro dos serviços, frequências e limite apresentados nesta página.</span></label>
            {error && <p className="card-auth__error" role="alert">{error}</p>}
            <button type="submit" disabled={disabled || !form.accepted}>{submitting ? <><LoaderCircle className="card-auth__spin" size={17} /> Autorizando...</> : <><LockKeyhole size={17} /> Autorizar cobranças automáticas</>}</button>
          </form>
          <p className="card-auth__security">Os dados do cartão são encaminhados pela infraestrutura da TENKA ao Asaas para tokenização. Número completo e CVV não são armazenados pela TENKA.</p>
          <p className="card-auth__legal">Ao continuar, você concorda com as condições exibidas. Consulte a <Link to={authorization.terms.privacyPath} target="_blank" rel="noreferrer">Política de Privacidade</Link> ou fale com <a href={`mailto:${authorization.terms.supportEmail}`}>{authorization.terms.supportEmail}</a>.</p>
        </section>
      </div>
    </div>
  </main>;
}

function PageState({ icon, title, text, success = false }: { icon: React.ReactNode; title: string; text: string; success?: boolean }) {
  return <main className="card-auth"><div className={`card-auth__state${success ? ' is-success' : ''}`}>{icon}<p className="card-auth__eyebrow">TENKA</p><h1>{title}</h1><p>{text}</p><a href="mailto:contato@tenka.com.br">Falar com a TENKA</a></div></main>;
}
