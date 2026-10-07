import { useState } from 'react';
import SiteShell, { ShellSection } from '../components/site/SiteShell';
import { routeFor } from '../seo/routes';
import {
  ADDRESS,
  CONTACT_EMAIL,
  MAPS_URL,
  PHONE_DISPLAY,
  hasWhatsapp,
  mailtoUrl,
  whatsappUrl,
} from '../config/contact';

const ACCENT = '#FF7A30';

/**
 * `/contato` era um PlaceholderPage com "em construção" — a página mais
 * comercial do site, vazia.
 *
 * ponytail: o envio monta uma mensagem pronta e abre WhatsApp ou e-mail. Não há
 * endpoint público de lead no backend (tudo em `/clients` é adminOnly/staffOnly),
 * e criar um exige rota pública + validação + rate limit + anti-spam +
 * notificação. Upgrade: `POST /leads` público e trocar `handleSubmit` por um
 * fetch, mantendo os dois canais como fallback.
 */

const DIVISIONS = [
  {
    id: 'games',
    label: 'Games e realidade virtual',
    hint: 'Jogos, advergame, gamificação, ativação em evento, treinamento em VR',
  },
  {
    id: 'studios',
    label: '3D, branding e identidade',
    hint: 'Maquete 3D, animação 3D, mockup de produto, identidade visual, logo',
  },
  {
    id: 'tech',
    label: 'Sites, sistemas e automações',
    hint: 'Site, SaaS, sistema sob medida, aplicativo, automação com IA',
  },
];

/** Mesma lista que gera o `FAQPage` JSON-LD — ver `seo/routes.ts`. */
const FAQ = routeFor('/contato')?.faq ?? [];

export default function ContactPage() {
  const [division, setDivision] = useState('games');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [brief, setBrief] = useState('');

  const selected = DIVISIONS.find((item) => item.id === division) ?? DIVISIONS[0];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const subject = `Projeto — ${selected.label}`;
    const body = [
      `Divisão: ${selected.label}`,
      `Nome: ${name || '—'}`,
      `Empresa: ${company || '—'}`,
      '',
      brief || '—',
    ].join('\n');

    if (hasWhatsapp) {
      // Nova aba: `location.href` descarta o formulário, e se a pessoa voltar
      // o que ela digitou já era.
      window.open(whatsappUrl(`Olá, TENKA! ${body}`), '_blank', 'noopener');
    } else {
      window.location.href = mailtoUrl(subject, body);
    }
  }

  return (
    <SiteShell path="/contato" accent={ACCENT}>
      <ShellSection title="Conte o que precisa" accent={ACCENT}>
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <fieldset>
            <legend className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
              Qual frente?
            </legend>
            <div className="mt-4 grid gap-3">
              {DIVISIONS.map((item) => (
                <label
                  key={item.id}
                  className={`flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors ${
                    division === item.id
                      ? 'border-white/40 bg-white/[0.06]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/25'
                  }`}
                >
                  <input
                    type="radio"
                    name="division"
                    value={item.id}
                    checked={division === item.id}
                    onChange={() => setDivision(item.id)}
                    className="mt-1 accent-[#FF7A30]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-[13px] leading-[1.6] text-white/50">
                      {item.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Seu nome" value={name} onChange={setName} />
            <Field label="Empresa" value={company} onChange={setCompany} />
          </div>

          <label className="mt-4 block">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
              O que precisa acontecer
            </span>
            <textarea
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              rows={5}
              required
              placeholder="Objetivo, prazo e qualquer restrição que já exista."
              className="mt-2 w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex min-h-[48px] items-center rounded-full px-7 text-[11px] font-bold uppercase tracking-[0.18em] text-[#08090b] transition-opacity hover:opacity-85"
            style={{ backgroundColor: ACCENT }}
          >
            {hasWhatsapp ? 'Enviar pelo WhatsApp' : 'Enviar por e-mail'}
          </button>
          <p className="mt-3 text-[12px] text-white/55">
            O botão abre {hasWhatsapp ? 'o WhatsApp' : 'seu cliente de e-mail'} com a
            mensagem já montada — você revisa antes de enviar.
          </p>
        </form>
      </ShellSection>

      <ShellSection title="Canais diretos" accent={ACCENT}>
        <div className="grid gap-4 sm:grid-cols-3">
          <a
            href={whatsappUrl('Olá, TENKA! Vim pelo site.')}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/12 bg-white/[0.03] p-5 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
              WhatsApp
            </p>
            <p className="mt-2 text-base font-semibold text-white">{PHONE_DISPLAY}</p>
            <p className="mt-1 text-[13px] text-white/50">Resposta mais rápida</p>
          </a>

          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="rounded-lg border border-white/12 bg-white/[0.03] p-5 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
              E-mail
            </p>
            <p className="mt-2 break-all text-base font-semibold text-white">
              {CONTACT_EMAIL}
            </p>
            <p className="mt-1 text-[13px] text-white/50">Para briefing e anexos</p>
          </a>

          <a
            href={MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/12 bg-white/[0.03] p-5 transition-colors hover:border-white/30 hover:bg-white/[0.06]"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/55">
              Endereço
            </p>
            {/* O mesmo texto do JSON-LD e do que vai no Google Business
                Profile — é esse casamento que sustenta a busca local. */}
            <address className="mt-2 text-sm not-italic leading-relaxed text-white/85">
              {ADDRESS.street}
              <br />
              {ADDRESS.district}, {ADDRESS.locality} — {ADDRESS.region}
              <br />
              CEP {ADDRESS.postalCode}
            </address>
            <p className="mt-2 text-[13px] text-white/50">Ver no mapa →</p>
          </a>
        </div>

        <p className="mt-6 max-w-2xl text-[14px] leading-[1.7] text-white/55">
          Projetos digitais — sites, sistemas, aplicativos, automações, 3D e branding —
          são entregues remotamente para todo o Brasil. Ativações e treinamentos com
          equipamento no local saem de São Paulo.
        </p>
      </ShellSection>

      <ShellSection title="Perguntas frequentes" accent={ACCENT}>
        <div className="max-w-3xl divide-y divide-white/10">
          {FAQ.map((item) => (
            <details key={item.question} className="group py-4">
              <summary className="cursor-pointer text-sm font-semibold text-white marker:content-none">
                {item.question}
              </summary>
              <p className="mt-3 text-[14px] leading-[1.75] text-white/65">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </ShellSection>
    </SiteShell>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/50">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none"
      />
    </label>
  );
}
