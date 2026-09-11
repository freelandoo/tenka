import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFormModal } from './ProjectFormModal';
import * as clientsService from '../../clients/clientsService';
import * as projectsService from '../services/projectsService';
import * as finance from '../../finance/financeService';
import type { BoardProject } from '../services/projectsService';
import { formatCurrencyFromCents } from '../../panel/format';
import type { ClientWithTotals } from '../../../lib/supabase/database.types';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'admin-1', role: 'admin' } }),
}));
vi.mock('../../panel/ToastContext', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('../../clients/clientsService', () => ({
  fetchClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
}));
vi.mock('../services/projectsService', () => ({
  createProject: vi.fn(),
  updateProject: vi.fn(),
  addAssignee: vi.fn(),
  removeAssignee: vi.fn(),
}));
vi.mock('../../finance/financeService', () => ({
  fetchProjectFinance: vi.fn(),
  saveSubscription: vi.fn(),
  clearSubscription: vi.fn(),
}));

const existingClient = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cliente sem contato',
  phone: '',
  email: '',
  notes: '',
  cpf_cnpj: '',
  asaas_customer_id: null,
  created_by: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
  archived_at: null,
  project_count: 1,
  total_value_cents: 0,
  active_fee_cents: 0,
  fee_count: 0,
  active_fee_count: 0,
  due_day: null,
} satisfies ClientWithTotals;

function makeProject(over: Partial<BoardProject> = {}): BoardProject {
  return {
    id: 'project-1',
    name: 'Projeto com mensalidade',
    description: '',
    value_cents: 0,
    monthly_fee_cents: 30_000,
    subscription_active: true,
    client_id: existingClient.id,
    client_name: existingClient.name,
    client_phone: '(11) 99999-8888',
    client_email: 'cliente@exemplo.com',
    due_day: 10,
    company: 'tenka',
    due_date: '2026-10-15',
    status: 'em_andamento',
    color_key: 'amarelo',
    position: 0,
    finalized_at: null,
    created_by: 'admin-1',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    archived_at: null,
    assignees: [],
    ...over,
  } as BoardProject;
}

function financeDetail(over: Record<string, unknown> = {}) {
  return {
    configured: true,
    environment: 'sandbox',
    project: { cpf_cnpj: '12345678909' },
    subscription: {
      amount_cents: 30_000, due_day: 10, status: 'active',
      asaas_subscription_id: 'sub-1',
    },
    projectPayments: [],
    subscriptionPayments: [],
    ...over,
  } as unknown as finance.ProjectFinance;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clientsService.fetchClients).mockResolvedValue([existingClient]);
  vi.mocked(clientsService.updateClient).mockResolvedValue(undefined);
  vi.mocked(projectsService.createProject).mockResolvedValue('project-1');
  vi.mocked(projectsService.updateProject).mockResolvedValue(undefined);
  vi.mocked(finance.fetchProjectFinance).mockResolvedValue(financeDetail());
  vi.mocked(finance.saveSubscription).mockResolvedValue(undefined as never);
  vi.mocked(finance.clearSubscription).mockResolvedValue({ cleared: true, queued: false });
});

describe('ProjectFormModal — contato do cliente', () => {
  it('permite preencher telefone e e-mail de cliente existente e os envia com o projeto', async () => {
    const user = userEvent.setup();
    render(
      <ProjectFormModal
        project={null}
        profiles={[]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    await user.selectOptions(await screen.findByLabelText('Cadastro'), existingClient.id);
    const phone = screen.getByLabelText('Telefone');
    const email = screen.getByLabelText('E-mail');
    const cpfCnpj = screen.getByLabelText('CPF/CNPJ (opcional)');
    expect(phone).not.toHaveAttribute('readonly');
    expect(email).not.toHaveAttribute('readonly');
    expect(cpfCnpj).not.toHaveAttribute('readonly');
    expect(screen.queryByText('Assinatura ativa')).not.toBeInTheDocument();
    const subscriptionHeading = screen.getByText('Mensalidade do projeto');
    expect(subscriptionHeading.closest('fieldset')).toBeNull();
    expect(subscriptionHeading.closest('section')).toHaveClass('project-form__finance');
    expect(screen.queryByLabelText('Primeiro/próximo vencimento')).toBeNull();
    expect(screen.queryByLabelText('Forma de pagamento')).toBeNull();

    await user.type(phone, '5511999998888');
    await user.type(email, 'Cliente@EXEMPLO.COM ');
    await user.type(cpfCnpj, '12345678909');
    expect(phone).toHaveValue('+55 (11) 99999-8888');
    expect(email).toHaveValue('cliente@exemplo.com');
    expect(cpfCnpj).toHaveValue('123.456.789-09');
    await user.type(screen.getByLabelText('Nome do projeto *'), 'Projeto com contato');
    await user.type(screen.getByLabelText('Data de entrega *'), '2026-10-15');
    await user.type(screen.getByLabelText('Valor mensal (R$)'), '299,90');
    await user.type(screen.getByLabelText('Dia do vencimento'), '10');
    expect(screen.getByText(/será salva como inativa/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() =>
      expect(projectsService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: existingClient.id,
          clientPhone: '+55 (11) 99999-8888',
          clientEmail: 'cliente@exemplo.com',
          clientCpfCnpj: '123.456.789-09',
          monthlyFeeCents: 29_990,
          subscriptionActive: false,
        }),
      ),
    );
    expect(clientsService.updateClient).not.toHaveBeenCalled();
  });
});

describe('ProjectFormModal — mensalidade simplificada', () => {
  // O cadastro central é a fonte do contato: o formulário recarrega telefone e
  // e-mail do cliente escolhido, então o fixture precisa tê-los preenchidos.
  beforeEach(() => {
    vi.mocked(clientsService.fetchClients).mockResolvedValue([
      { ...existingClient, phone: '(11) 99999-8888', email: 'cliente@exemplo.com' },
    ]);
  });

  it('preserva uma mensalidade ativa ao editar valor e dia, sem expor controle de ativação', async () => {
    const user = userEvent.setup();

    render(
      <ProjectFormModal project={makeProject()} profiles={[]} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    const fee = await screen.findByLabelText('Valor mensal (R$)');
    await waitFor(() => expect(fee).toHaveValue(formatCurrencyFromCents(30_000)));
    expect(screen.queryByRole('checkbox', { name: /Assinatura ativa/i })).toBeNull();
    expect(screen.getByText(/mensalidade já está ativa/i)).toBeInTheDocument();
    await user.clear(fee);
    await user.type(fee, '350,00');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(finance.saveSubscription).toHaveBeenCalledWith('project-1',
      expect.objectContaining({ amountCents: 35_000, activate: true, applyToCurrentPayment: false })));
  });

  it('mantém uma mensalidade ainda inativa e orienta a ativação pelo Financeiro', async () => {
    const user = userEvent.setup();
    vi.mocked(finance.fetchProjectFinance).mockResolvedValue(financeDetail({
      subscription: {
        amount_cents: 30_000, due_day: 10, status: 'draft', asaas_subscription_id: null,
      },
    }));

    render(
      <ProjectFormModal project={makeProject()} profiles={[]} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    const fee = await screen.findByLabelText('Valor mensal (R$)');
    await waitFor(() => expect(fee).toHaveValue(formatCurrencyFromCents(30_000)));
    expect(screen.getByText(/Para começar a cobrar, acesse Financeiro/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(finance.saveSubscription).toHaveBeenCalledWith('project-1',
      expect.objectContaining({ activate: false, applyToCurrentPayment: false })));
  });

  it('aceita valor zero e remove a mensalidade em vez de deixar a recorrência cobrando', async () => {
    const user = userEvent.setup();
    render(
      <ProjectFormModal project={makeProject()} profiles={[]} onClose={vi.fn()} onSaved={vi.fn()} />,
    );

    const fee = await screen.findByLabelText('Valor mensal (R$)');
    await waitFor(() => expect(fee).toHaveValue(formatCurrencyFromCents(30_000)));
    await user.clear(fee);
    await user.type(fee, '0');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => expect(finance.clearSubscription).toHaveBeenCalledWith('project-1'));
    expect(finance.saveSubscription).not.toHaveBeenCalled();
  });
});
