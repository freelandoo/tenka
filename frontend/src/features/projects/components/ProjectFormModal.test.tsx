import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectFormModal } from './ProjectFormModal';
import * as clientsService from '../../clients/clientsService';
import * as projectsService from '../services/projectsService';
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(clientsService.fetchClients).mockResolvedValue([existingClient]);
  vi.mocked(clientsService.updateClient).mockResolvedValue(undefined);
  vi.mocked(projectsService.createProject).mockResolvedValue('project-1');
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

    await user.selectOptions(await screen.findByLabelText('Cliente'), existingClient.id);
    const phone = screen.getByLabelText('Telefone');
    const email = screen.getByLabelText('E-mail');
    expect(phone).not.toHaveAttribute('readonly');
    expect(email).not.toHaveAttribute('readonly');
    expect(screen.getByText('Assinatura ativa')).toBeInTheDocument();
    const subscriptionHeading = screen.getByText('Mensalidade do projeto');
    expect(subscriptionHeading.closest('fieldset')).toBeNull();
    expect(subscriptionHeading.closest('section')).toHaveClass('project-form__finance');
    expect(screen.queryByLabelText('Primeiro/próximo vencimento')).toBeNull();
    expect(screen.queryByLabelText('Forma de pagamento')).toBeNull();

    await user.type(phone, '(11) 99999-8888');
    await user.type(email, 'cliente@exemplo.com');
    await user.type(screen.getByLabelText('Nome do projeto *'), 'Projeto com contato');
    await user.type(screen.getByLabelText('Data de entrega *'), '2026-10-15');
    await user.click(screen.getByRole('button', { name: 'Criar projeto' }));

    await waitFor(() =>
      expect(projectsService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: existingClient.id,
          clientPhone: '(11) 99999-8888',
          clientEmail: 'cliente@exemplo.com',
        }),
      ),
    );
    expect(clientsService.updateClient).not.toHaveBeenCalled();
  });
});
