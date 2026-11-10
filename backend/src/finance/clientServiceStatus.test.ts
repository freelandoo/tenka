import { describe, expect, it } from 'vitest';
import { canTransitionClientService, isClientServiceStatus } from './clientServiceStatus';

describe('canTransitionClientService', () => {
  it('permite o fluxo normal de ativação, pausa e encerramento', () => {
    expect(canTransitionClientService('draft', 'active')).toBe(true);
    expect(canTransitionClientService('active', 'paused')).toBe(true);
    expect(canTransitionClientService('paused', 'active')).toBe(true);
    expect(canTransitionClientService('active', 'ended')).toBe(true);
    expect(canTransitionClientService('ended', 'archived')).toBe(true);
  });

  it('não reativa um serviço encerrado nem mexe num arquivado', () => {
    expect(canTransitionClientService('ended', 'active')).toBe(false);
    expect(canTransitionClientService('archived', 'active')).toBe(false);
    expect(canTransitionClientService('archived', 'paused')).toBe(false);
  });

  it('recusa pular etapas', () => {
    expect(canTransitionClientService('draft', 'paused')).toBe(false);
    expect(canTransitionClientService('active', 'archived')).toBe(false);
  });

  it('reconhece status válidos', () => {
    expect(isClientServiceStatus('active')).toBe(true);
    expect(isClientServiceStatus('inexistente')).toBe(false);
  });
});
