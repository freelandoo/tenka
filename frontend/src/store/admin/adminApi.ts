/**
 * Chamadas do admin para os produtos cadastrados pelo painel. A rota exige
 * admin no servidor (`adminOnly`); esconder o botão é só interface.
 */

import { apiRequest, loadTokens } from '../../lib/api/client';

export interface AdminProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  recurring: boolean;
  /** 1 = mensal, 12 = anual; `null` na opção única. */
  intervalMonths: number | null;
  active: boolean;
  hasThumbnail: boolean;
  version: number;
  createdAt: string;
}

export interface ThumbnailUpload {
  type: 'image/webp' | 'image/jpeg' | 'image/png';
  /** base64, sem o prefixo `data:`. */
  data: string;
}

export interface ProductPayload {
  name: string;
  description: string;
  priceCents: number;
  recurring: boolean;
  intervalMonths: 1 | 12;
  active: boolean;
  /** `undefined` não mexe; `null` remove. */
  thumbnail?: ThumbnailUpload | null;
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  return (await apiRequest<{ products: AdminProduct[] }>('/admin/store/products')).products;
}

export async function createAdminProduct(payload: ProductPayload): Promise<AdminProduct> {
  return (await apiRequest<{ product: AdminProduct }>('/admin/store/products', { method: 'POST', body: payload })).product;
}

export async function updateAdminProduct(id: string, payload: Partial<ProductPayload>): Promise<AdminProduct> {
  return (await apiRequest<{ product: AdminProduct }>(`/admin/store/products/${id}`, { method: 'PATCH', body: payload })).product;
}

export async function deleteAdminProduct(id: string): Promise<void> {
  await apiRequest(`/admin/store/products/${id}`, { method: 'DELETE' });
}

/** Admin logado neste navegador? Sem sessão salva, nem pergunta ao servidor. */
export async function isAdminSession(): Promise<boolean> {
  if (!loadTokens()) return false;
  try {
    const { profile } = await apiRequest<{ profile: { role?: string; active?: boolean } | null }>('/auth/me');
    return profile?.role === 'admin';
  } catch {
    return false;
  }
}

const THUMB_MAX_SIDE = 1200;
const THUMB_MAX_BYTES = 780 * 1024;

function blobFromCanvas(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Reduz a foto no navegador (≤ 1200 px, webp; jpeg onde o navegador não gera
 * webp) — o servidor guarda no banco e recusa acima de 800 KB.
 */
export async function prepareThumbnail(file: File): Promise<ThumbnailUpload & { previewUrl: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, THUMB_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of [0.86, 0.72, 0.58]) {
    blob = await blobFromCanvas(canvas, 'image/webp', quality);
    if (blob && blob.type !== 'image/webp') blob = await blobFromCanvas(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= THUMB_MAX_BYTES) break;
  }
  if (!blob || blob.size > THUMB_MAX_BYTES) throw new Error('Imagem grande demais. Tente outra.');
  const type = blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Não deu para ler a imagem.'));
    reader.readAsDataURL(blob!);
  });
  return { type, data: dataUrl.slice(dataUrl.indexOf(',') + 1), previewUrl: dataUrl };
}

/** "1.234,56" / "1234.5" / "99" → centavos; inválido → null. */
export function parsePriceToCents(input: string): number | null {
  let s = input.replace(/[R$\s]/g, '');
  if (!s) return null;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return cents >= 100 ? cents : null;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function adminErrorMessage(code: string): string {
  const map: Record<string, string> = {
    'dados-invalidos': 'Confira os campos: nome com 2+ letras e valor a partir de R$ 1,00.',
    'imagem-invalida': 'A imagem não foi aceita. Tente um JPG, PNG ou WebP.',
    'produto-com-pedidos': 'Este produto já foi vendido e não pode ser apagado. Desmarque "Mostrar na vitrine" para escondê-lo.',
    'produto-nao-encontrado': 'Produto não encontrado. Atualize a página.',
    network: 'Sem conexão com o servidor.',
  };
  return map[code] ?? 'Não deu para salvar. Tente de novo.';
}
