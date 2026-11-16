import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import ProductCard from './ProductCard';
import { useStoreStatus } from './status';
import type { AdminProduct } from './admin/adminApi';

// O formulário (e a conversa com a API do admin) só baixa para quem é admin.
const ProductEditor = lazy(() => import('./admin/ProductEditor'));
const adminApi = () => import('./admin/adminApi');

/**
 * Seção da /loja com os produtos cadastrados pelo painel. Visitante vê só os
 * produtos (e nada, se não houver nenhum); admin logado vê também o botão
 * "Adicionar produto" e "Editar" em cada card.
 */
export default function CustomProducts({ firstIndex }: { firstIndex: number }) {
  const { custom, reload } = useStoreStatus();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminList, setAdminList] = useState<AdminProduct[]>([]);
  const [editing, setEditing] = useState<AdminProduct | null | 'new'>(null);

  const refreshAdmin = useCallback(async () => {
    const api = await adminApi();
    setAdminList(await api.listAdminProducts().catch(() => []));
  }, []);

  useEffect(() => {
    let alive = true;
    void adminApi()
      .then((api) => api.isAdminSession())
      .then((admin) => {
        if (!alive || !admin) return;
        setIsAdmin(true);
        void refreshAdmin();
      });
    return () => {
      alive = false;
    };
  }, [refreshAdmin]);

  if (custom.length === 0 && !isAdmin) return null;

  return (
    <section id="produtos" className="pc-section">
      <header className="pc-section__head">
        <p className="tf-mono">04 / Produtos</p>
        <h2 className="tf-display pc-section__title">
          <span className="tf-grunge">Mais da</span> <span className="tf-grunge tf-grunge-acc">TENKA.</span>
        </h2>
        <span className="pc-section__bar" aria-hidden="true" />
        <p className="pc-section__lead">Serviços avulsos e assinaturas — pague no cartão pelo Mercado Pago.</p>
        {isAdmin && (
          <button type="button" className="tf-btn lj-admin-add" onClick={() => setEditing('new')}>
            <Plus size={16} aria-hidden="true" /> Adicionar produto
          </button>
        )}
      </header>

      {custom.length > 0 ? (
        <div className="lj-grid lj-grid--3">
          {custom.map((product, i) => {
            const admin = adminList.find((p) => p.slug === product.slug);
            return (
              <ProductCard
                key={product.slug}
                product={product}
                index={firstIndex + i}
                onEdit={isAdmin && admin ? () => setEditing(admin) : undefined}
              />
            );
          })}
        </div>
      ) : (
        <p className="tf-mono lj-admin-empty">Nenhum produto cadastrado ainda. Só você (admin) está vendo esta seção.</p>
      )}

      {editing && (
        <Suspense fallback={null}>
          <ProductEditor
            product={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              void reload();
              void refreshAdmin();
            }}
          />
        </Suspense>
      )}
    </section>
  );
}
