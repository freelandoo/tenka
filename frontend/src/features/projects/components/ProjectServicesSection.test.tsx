import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as finance from '../../finance/financeService';
import { ProjectServicesSection } from './ProjectServicesSection';

vi.mock('../../finance/financeService', () => ({
  fetchProjectServices: vi.fn(),
  fetchProjectCardAuthorization: vi.fn(),
  createProjectCardAuthorizationLink: vi.fn(),
  configureProjectRecurringBilling: vi.fn(),
  revokeProjectCardAuthorization: vi.fn(),
  transitionProjectService: vi.fn(),
  previewProjectService: vi.fn(),
  createProjectService: vi.fn(),
  updateProjectService: vi.fn(),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const mockedServices = vi.mocked(finance.fetchProjectServices);
const mockedAuthorization = vi.mocked(finance.fetchProjectCardAuthorization);
const mockedCreateService = vi.mocked(finance.createProjectService);
const mockedPreviewService = vi.mocked(finance.previewProjectService);

beforeEach(() => {
  vi.clearAllMocks();
  mockedServices.mockResolvedValue({
    services: [], billing: { dueDay: 9, billingType: 'CREDIT_CARD' }, billingConfigured: true,
  });
  mockedAuthorization.mockResolvedValue({
    authorization: {
      id: 'authorization-1', status: 'authorized', card_brand: 'Visa',
      card_last_four: '1111', authorized_at: '2026-11-10T12:00:00Z',
      authorized_limit_cents: 10_000, term_version: '2026-11-10.v1', revoked_at: null,
    },
    authorizationCurrent: false,
    linkRequired: true,
    latestLink: {
      id: 'link-1', status: 'active', state: 'active',
      expires_at: '2026-11-11T12:00:00Z', created_at: '2026-11-10T12:00:00Z',
      url: 'https://painel.tenka.com/autorizar-cobrancas/link-seguro',
    },
    linkIssue: null,
    nextCharge: { due_date: '2026-12-09', amount_cents: 18_000 },
    sandboxOnly: true,
  });
  mockedCreateService.mockResolvedValue({ id: 'service-1' });
  mockedPreviewService.mockResolvedValue({
    billing: { dueDay: 9, billingType: 'CREDIT_CARD' },
    dueDate: '2027-01-09', currentAmountCents: 6_000,
    newServiceAmountCents: 8_000, totalAmountCents: 14_000,
    currentAvailable: true, emitted: false,
  });
});

describe('ProjectServicesSection — atualização da autorização', () => {
  it('mostra o link preparado e mantém o serviço novo fora do cartão até o cliente aceitar', async () => {
    render(<ProjectServicesSection projectId="project-1" />);

    expect(await screen.findByText('Atualização necessária')).toBeInTheDocument();
    expect(screen.getByLabelText('Link de autorização')).toHaveValue(
      'https://painel.tenka.com/autorizar-cobrancas/link-seguro',
    );
    expect(screen.getByText(/O serviço novo só entra na cobrança depois que o cliente confirmar/i))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Renovar link agora/i })).toBeInTheDocument();
  });

  it('permite organizar um serviço antes de preparar o link', async () => {
    mockedServices.mockResolvedValue({ services: [], billing: null, billingConfigured: false });
    mockedAuthorization.mockResolvedValue({
      authorization: null,
      authorizationCurrent: false,
      linkRequired: false,
      latestLink: null,
      linkIssue: 'cobranca-recorrente-nao-configurada',
      nextCharge: null,
      sandboxOnly: true,
    });
    render(<ProjectServicesSection projectId="project-1" />);

    const add = await screen.findByRole('button', { name: /Adicionar serviço/i });
    expect(add).toBeEnabled();
    fireEvent.click(add);
    expect(screen.getByRole('heading', { name: 'Adicionar serviço' })).toBeInTheDocument();
    expect(screen.getByText(/Data prevista:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar link de autorização' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nome *'), { target: { value: 'Domínio' } });
    fireEvent.change(screen.getByLabelText('Valor (R$) *'), { target: { value: '80,00' } });
    fireEvent.change(screen.getByLabelText('Frequência *'), { target: { value: 'annual' } });
    fireEvent.click(screen.getByRole('button', { name: /^Adicionar$/ }));

    await waitFor(() => expect(mockedCreateService).toHaveBeenCalledWith('project-1', {
      name: 'Domínio', description: '', amountCents: 8_000, frequency: 'annual',
      startMode: 'next', startDate: undefined, activate: false,
    }));
  });

  it('mostra a data exata para cobrança atual, próxima e agendada', async () => {
    mockedPreviewService.mockImplementation(async (_projectId, input) => ({
      billing: { dueDay: 9, billingType: 'CREDIT_CARD' },
      dueDate: input.startMode === 'current' ? '2026-12-09'
        : input.startMode === 'scheduled' ? '2027-02-09' : '2027-01-09',
      currentAmountCents: 6_000,
      newServiceAmountCents: input.amountCents,
      totalAmountCents: 6_000 + input.amountCents,
      currentAvailable: true,
      emitted: false,
    }));
    render(<ProjectServicesSection projectId="project-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Adicionar serviço/i }));
    expect(await screen.findByText(/Data prevista: 09\/01\/2027/i)).toBeInTheDocument();
    expect(mockedPreviewService).toHaveBeenCalledWith('project-1', expect.objectContaining({
      amountCents: 0, startMode: 'next',
    }));

    fireEvent.click(screen.getByRole('radio', { name: 'Cobrança atual' }));
    expect(await screen.findByText(/Data prevista: 09\/12\/2026/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('radio', { name: 'Agendar início' }));
    const scheduledMonth = screen.getByLabelText('Mês de início agendado');
    expect(scheduledMonth).toHaveAttribute('type', 'month');
    fireEvent.change(scheduledMonth, { target: { value: '2027-02' } });
    expect(await screen.findByText(/Data prevista: 09\/02\/2027/i)).toBeInTheDocument();
    expect(mockedPreviewService).toHaveBeenCalledWith('project-1', expect.objectContaining({
      startMode: 'scheduled', startDate: '2027-02-01',
    }));
  });
});
