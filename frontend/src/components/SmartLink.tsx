import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/**
 * Caminhos servidos por outro app no mesmo domínio (ex.: a Innovation Week,
 * site Vite à parte em /innovation-week). O router do SPA não os conhece, então
 * a navegação precisa recarregar o documento.
 */
const STANDALONE_APPS = ['/innovation-week'];

export function isStandaloneAppHref(href: string): boolean {
  return STANDALONE_APPS.some((base) => href === base || href.startsWith(`${base}/`) || href.startsWith(`${base}?`));
}

interface SmartLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  children?: ReactNode;
}

/**
 * Renders a react-router <Link> for internal routes ("/games") and a plain
 * <a target="_blank"> for external URLs ("https://..."), so the admin can
 * point any CTA directly at a live site.
 */
export default function SmartLink({ to, children, ...rest }: SmartLinkProps) {
  if (isExternalHref(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  if (isStandaloneAppHref(to)) {
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  );
}
