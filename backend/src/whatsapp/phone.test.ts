/**
 * Normalização de telefone e filtro de JID. Porte de `telefone.test.ts` do
 * Coliseu, com o caso novo do `jidFromPhone` (o painel envia a partir do
 * `client_phone` digitado à mão).
 */

import { describe, expect, it } from 'vitest';
import {
  formatPhone,
  isConversationJid,
  isGroupJid,
  isPersonJid,
  jidFromPhone,
  phoneFromJid,
  phoneKey,
  redactPhone,
} from './phone';

describe('phoneKey', () => {
  it('casa o mesmo número escrito de formas diferentes', () => {
    const alvo = phoneKey('5511988887777');
    expect(phoneKey('(11) 98888-7777')).toBe(alvo);
    expect(phoneKey('11988887777')).toBe(alvo);
    // Sem o 9º dígito o final continua igual — é o ponto de usar 8 dígitos.
    expect(phoneKey('1188887777')).toBe(alvo);
  });

  it('devolve vazio para lixo curto demais', () => {
    expect(phoneKey('123')).toBe('');
    expect(phoneKey(null)).toBe('');
  });
});

describe('classificação de JID', () => {
  it('separa grupo, pessoa, transmissão e status', () => {
    expect(isGroupJid('120363000000000000@g.us')).toBe(true);
    expect(isPersonJid('5511988887777@s.whatsapp.net')).toBe(true);
    expect(isPersonJid('120363000000000000@g.us')).toBe(false);
    expect(isConversationJid('120363000000000000@g.us')).toBe(true);
    // Transmissão e status não são conversa: são publicação de mão única.
    expect(isConversationJid('status@broadcast')).toBe(false);
    expect(isConversationJid('1234@broadcast')).toBe(false);
    expect(isConversationJid('')).toBe(false);
  });
});

describe('phoneFromJid', () => {
  it('extrai o número de uma conversa pessoal', () => {
    expect(phoneFromJid('5511988887777@s.whatsapp.net')).toBe('5511988887777');
  });

  it('não inventa telefone para @lid nem para grupo', () => {
    // O 120363… tem cara de telefone; tratá-lo como número amarraria a conversa
    // ao projeto errado.
    expect(phoneFromJid('120363000000000000@g.us')).toBe('');
    expect(phoneFromJid('99999@lid')).toBe('');
  });
});

describe('jidFromPhone', () => {
  it('completa o DDI 55 do que foi digitado no painel', () => {
    expect(jidFromPhone('(11) 98888-7777')).toBe('5511988887777@s.whatsapp.net');
    expect(jidFromPhone('5511988887777')).toBe('5511988887777@s.whatsapp.net');
  });

  it('recusa número curto demais para ser telefone', () => {
    expect(jidFromPhone('9999')).toBe('');
    expect(jidFromPhone('')).toBe('');
  });
});

describe('exibição', () => {
  it('formata com e sem DDI e com 10 ou 11 dígitos', () => {
    expect(formatPhone('5511988887777')).toBe('(11) 98888-7777');
    expect(formatPhone('1138887777')).toBe('(11) 3888-7777');
    expect(formatPhone('')).toBe('');
  });

  it('nunca loga o telefone inteiro', () => {
    expect(redactPhone('5511988887777')).toBe('****7777');
    expect(redactPhone('12')).toBe('****');
  });
});
