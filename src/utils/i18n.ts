import { fr } from '../data/locales/fr';
import { en } from '../data/locales/en';

export type Locale = 'fr' | 'en';

export type Messages = typeof fr | typeof en;

export function getMessages(locale: Locale): Messages {
  return locale === 'en' ? en : fr;
}

/** Route slug without locale, e.g. `/about/` → `about`, `/` → `` */
export function slugFromPathname(pathname: string): string {
  const n = pathname.replace(/\/$/, '') || '/';
  if (n === '/' || n === '/en') return '';
  if (n.startsWith('/en/')) return n.slice(4).replace(/\/$/, '');
  return n.slice(1).replace(/\/$/, '');
}

/** Alternate URLs for hreflang (trailingSlash site). */
export function getAlternateUrls(site: string, slug: string): { fr: string; en: string } {
  const base = site.replace(/\/$/, '');
  const path = slug === '' || slug === '/' ? '' : `${slug.replace(/^\/|\/$/g, '')}/`;
  return {
    fr: path ? `${base}/${path}` : `${base}/`,
    en: path ? `${base}/en/${path}` : `${base}/en/`,
  };
}
