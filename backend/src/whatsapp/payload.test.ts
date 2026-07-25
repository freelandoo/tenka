/**
 * Leitura do payload do Baileys. Módulo puro — sem banco, sem rede.
 * Porte dos casos de `payload.test.ts` do Coliseu.
 */

import { describe, expect, it } from 'vitest';
import { isConnectionOpen, MEDIA_LABEL, messagesOfEvent, readMessage } from './payload';

function raw(over: Record<string, unknown> = {}) {
  return {
    key: { id: 'ABC123', remoteJid: '5511900000000@s.whatsapp.net', fromMe: false },
    pushName: 'Fulano',
    messageTimestamp: 1_700_000_000,
    message: { conversation: 'oi' },
    ...over,
  };
}

describe('readMessage', () => {
  it('lê texto simples', () => {
    const msg = readMessage(raw());
    expect(msg).toMatchObject({
      waMessageId: 'ABC123',
      remoteJid: '5511900000000@s.whatsapp.net',
      body: 'oi',
      mediaType: 'text',
      fromMe: false,
      pushName: 'Fulano',
    });
    expect(msg!.sentAt.getTime()).toBe(1_700_000_000_000);
  });

  it('lê extendedTextMessage', () => {
    const msg = readMessage(raw({ message: { extendedTextMessage: { text: 'com link' } } }));
    expect(msg?.body).toBe('com link');
  });

  it('usa a legenda da imagem quando existe', () => {
    const msg = readMessage(raw({ message: { imageMessage: { caption: 'olha isso' } } }));
    expect(msg).toMatchObject({ body: 'olha isso', mediaType: 'image' });
  });

  it('rotula mídia sem legenda em vez de descartar', () => {
    const msg = readMessage(raw({ message: { audioMessage: {} } }));
    expect(msg).toMatchObject({ body: MEDIA_LABEL.audio, mediaType: 'audio' });
  });

  it('descarta mensagem sem conteúdo aproveitável', () => {
    expect(readMessage(raw({ message: { conversation: '   ' } }))).toBeNull();
    expect(readMessage(raw({ message: null }))).toBeNull();
    expect(readMessage(raw({ key: { id: '', remoteJid: 'x@s.whatsapp.net' } }))).toBeNull();
  });

  it('prefere remoteJidAlt quando o principal é @lid', () => {
    const msg = readMessage(
      raw({
        key: {
          id: 'A',
          remoteJid: '99999@lid',
          remoteJidAlt: '5511988887777@s.whatsapp.net',
          fromMe: false,
        },
      }),
    );
    expect(msg?.remoteJid).toBe('5511988887777@s.whatsapp.net');
  });

  it('em grupo mantém o JID do grupo e separa o participante', () => {
    const msg = readMessage(
      raw({
        key: {
          id: 'G1',
          remoteJid: '120363000000000000@g.us',
          remoteJidAlt: '5511988887777@s.whatsapp.net',
          participant: '5511988887777@s.whatsapp.net',
          fromMe: false,
        },
      }),
    );
    expect(msg?.remoteJid).toBe('120363000000000000@g.us');
    expect(msg?.participant).toBe('5511988887777@s.whatsapp.net');
  });

  it('timestamp ausente cai para agora em vez de 1970', () => {
    const antes = Date.now() - 1000;
    const msg = readMessage(raw({ messageTimestamp: undefined }));
    expect(msg!.sentAt.getTime()).toBeGreaterThan(antes);
  });
});

describe('messagesOfEvent', () => {
  it('aceita array direto, `messages` e objeto único', () => {
    expect(messagesOfEvent([1, 2])).toHaveLength(2);
    expect(messagesOfEvent({ messages: [1] })).toHaveLength(1);
    expect(messagesOfEvent({ key: {} })).toHaveLength(1);
    expect(messagesOfEvent(null)).toHaveLength(0);
  });
});

describe('isConnectionOpen', () => {
  it('só considera aberta os estados de conexão viva', () => {
    expect(isConnectionOpen('open')).toBe(true);
    expect(isConnectionOpen('connected')).toBe(true);
    // `connecting` é estado de passagem: tratar como caído derrubava a sessão.
    expect(isConnectionOpen('connecting')).toBe(false);
    expect(isConnectionOpen('close')).toBe(false);
    expect(isConnectionOpen(undefined)).toBe(false);
  });
});
