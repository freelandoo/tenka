import PlaceholderPage from '../components/PlaceholderPage';
import { useNoindex } from '../seo/useSeo';

export default function NotFoundPage() {
  // Um SPA estático no Vercel responde 200 para qualquer caminho (o rewrite
  // manda tudo para index.html), então esta página era um soft 404: o Google
  // podia indexar "/qualquer-coisa" como página válida. O noindex é o que
  // impede isso sem precisar de serverless function só para devolver o status.
  useNoindex();

  return (
    <PlaceholderPage
      eyebrow="TENKA"
      title="Página não encontrada"
      description="Esta página não existe. Volte para a home para conhecer as divisões da TENKA — Games, Studios e Tech."
      background="#141419"
      accent="#FF7A30"
    />
  );
}
