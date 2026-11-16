/**
 * Produtos cadastrados pelo painel (admin). Só mexe em `custom = true`: o seed
 * da 0045 é espelhado no front e editar aqui faria a vitrine anunciar um preço
 * e o checkout cobrar outro.
 *
 * Recorrente = `subscription` mensal ou anual (preapproval do MP com ciclo de
 * 1 ou 12 meses: o cartão é cobrado a cada ciclo). Única = `fixed` (preference, até 12x). O checkout já sabe cobrar
 * os dois; aqui só nasce a linha certa.
 */

import { z } from 'zod';
import type { Queryable } from './orders';

export const THUMB_MAX_BYTES = 800 * 1024;
const THUMB_TYPES = ['image/webp', 'image/jpeg', 'image/png'] as const;
type ThumbType = (typeof THUMB_TYPES)[number];

const thumbnailSchema = z
  .object({ type: z.enum(THUMB_TYPES), data: z.string().min(1).max(Math.ceil((THUMB_MAX_BYTES * 4) / 3) + 8) })
  .nullable();

export const productInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  /** Centavos. */
  priceCents: z.number().int().min(100).max(100_000_000),
  recurring: z.boolean(),
  /** Ciclo da recorrência: 1 = mensal, 12 = anual. Ignorado na opção única. */
  intervalMonths: z.union([z.literal(1), z.literal(12)]).default(1),
  active: z.boolean().default(true),
  /** `undefined` = não mexe; `null` = remove; objeto = troca. */
  thumbnail: thumbnailSchema.optional(),
});

export const productPatchSchema = productInputSchema.partial().extend({
  // Sem default no PATCH: ausente = não mexe.
  intervalMonths: z.union([z.literal(1), z.literal(12)]).optional(),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductPatch = z.infer<typeof productPatchSchema>;

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

/** "Consultoria de Tráfego Pago!" → "consultoria-de-trafego-pago". */
export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
  return s || 'produto';
}

/** Decodifica e confere se os bytes são mesmo do tipo declarado (assinatura do arquivo). */
export function decodeThumbnail(input: { type: ThumbType; data: string }): { bytes: Buffer; type: ThumbType } | null {
  const raw = input.data.includes(',') ? input.data.slice(input.data.indexOf(',') + 1) : input.data;
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < 12 || bytes.length > THUMB_MAX_BYTES) return null;
  const ok =
    input.type === 'image/jpeg'
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : input.type === 'image/png'
        ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return ok ? { bytes, type: input.type } : null;
}

const COLS = `id, slug, name, description, price_cents, kind, interval_months, active, thumbnail is not null as has_thumbnail,
  floor(extract(epoch from updated_at))::bigint as version, created_at`;

interface Row {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_cents: number | string;
  kind: string;
  interval_months: number | null;
  active: boolean;
  has_thumbnail: boolean;
  version: number | string;
  created_at: string | Date;
}

function toAdmin(r: Row): AdminProduct {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    priceCents: Number(r.price_cents),
    recurring: r.kind === 'subscription',
    intervalMonths: r.kind === 'subscription' ? Number(r.interval_months ?? 1) : null,
    active: r.active,
    hasThumbnail: r.has_thumbnail,
    version: Number(r.version),
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export async function listCustomProducts(db: Queryable): Promise<AdminProduct[]> {
  const { rows } = await db.query<Row>(`select ${COLS} from public.products where custom order by sort, created_at`);
  return rows.map(toAdmin);
}

export class ProductError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

async function freeSlug(db: Queryable, base: string): Promise<string> {
  const { rows } = await db.query<{ slug: string }>(
    `select slug from public.products where slug = $1 or slug like $2`,
    [base, `${base}-%`],
  );
  const taken = new Set(rows.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

function thumbOrThrow(t: { type: ThumbType; data: string }) {
  const decoded = decodeThumbnail(t);
  if (!decoded) throw new ProductError(400, 'imagem-invalida');
  return decoded;
}

export async function createCustomProduct(db: Queryable, input: ProductInput): Promise<AdminProduct> {
  const thumb = input.thumbnail ? thumbOrThrow(input.thumbnail) : null;
  const slug = await freeSlug(db, slugify(input.name));
  const { rows } = await db.query<Row>(
    `insert into public.products
       (slug, name, kind, category, tagline, description, price_cents, interval_months, features, addons,
        addon_only, featured, active, sort, custom, thumbnail, thumbnail_type)
     values ($1, $2, $3, 'loja', '', $4, $5, $6, '[]'::jsonb, '[]'::jsonb, false, false, $7,
        coalesce((select max(sort) from public.products), 0) + 10, true, $8, $9)
     returning ${COLS}`,
    [
      slug,
      input.name,
      input.recurring ? 'subscription' : 'fixed',
      input.description,
      input.priceCents,
      input.recurring ? input.intervalMonths : null,
      input.active,
      thumb?.bytes ?? null,
      thumb?.type ?? null,
    ],
  );
  return toAdmin(rows[0]!);
}

export async function updateCustomProduct(db: Queryable, id: string, patch: ProductPatch): Promise<AdminProduct | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const set = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.name !== undefined) set('name', patch.name);
  if (patch.description !== undefined) set('description', patch.description);
  if (patch.priceCents !== undefined) set('price_cents', patch.priceCents);
  if (patch.active !== undefined) set('active', patch.active);
  if (patch.recurring !== undefined) {
    set('kind', patch.recurring ? 'subscription' : 'fixed');
    set('interval_months', patch.recurring ? (patch.intervalMonths ?? 1) : null);
  } else if (patch.intervalMonths !== undefined) {
    // Só troca o ciclo de quem já é recorrente (a constraint exige null na única).
    params.push(patch.intervalMonths);
    sets.push(`interval_months = case when kind = 'subscription' then $${params.length}::integer else null end`);
  }
  if (patch.thumbnail === null) {
    set('thumbnail', null);
    set('thumbnail_type', null);
  } else if (patch.thumbnail) {
    const t = thumbOrThrow(patch.thumbnail);
    set('thumbnail', t.bytes);
    set('thumbnail_type', t.type);
  }
  sets.push('updated_at = now()');
  params.push(id);
  const { rows } = await db.query<Row>(
    `update public.products set ${sets.join(', ')} where id = $${params.length} and custom returning ${COLS}`,
    params,
  );
  return rows[0] ? toAdmin(rows[0]) : null;
}

/**
 * Apaga só se nenhum pedido citou o produto — pedido guarda a foto do carrinho
 * por slug, e o slug liberado poderia voltar como outro produto. Vendido uma
 * vez, o caminho é desativar (some da vitrine, o histórico fica).
 */
export async function deleteCustomProduct(db: Queryable, id: string): Promise<'deleted' | 'not-found' | 'has-orders'> {
  const { rows } = await db.query<{ slug: string }>(`select slug from public.products where id = $1 and custom`, [id]);
  const slug = rows[0]?.slug;
  if (!slug) return 'not-found';
  const used = await db.query(`select 1 from public.store_orders where items @> $1::jsonb limit 1`, [
    JSON.stringify([{ slug }]),
  ]);
  if (used.rows.length > 0) return 'has-orders';
  await db.query(`delete from public.products where id = $1 and custom`, [id]);
  return 'deleted';
}

export async function readThumbnail(db: Queryable, slug: string): Promise<{ bytes: Buffer; type: string } | null> {
  const { rows } = await db.query<{ thumbnail: Buffer | Uint8Array | null; thumbnail_type: string | null }>(
    `select thumbnail, thumbnail_type from public.products where slug = $1 and active`,
    [slug],
  );
  const r = rows[0];
  if (!r?.thumbnail || !r.thumbnail_type) return null;
  return { bytes: Buffer.from(r.thumbnail), type: r.thumbnail_type };
}
