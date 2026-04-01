import { COOKIE_NAME } from './constants.js';

/**
 * Server-side locale detection from request.
 * Priority: cookie > Accept-Language header > default
 */
export function getLocaleFromRequest(
  request: Request,
  supportedLocales: string[],
  defaultLocale: string
): string {
  // 1. Cookie
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieMatch = cookieHeader
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (cookieMatch) {
    const cookieLocale = cookieMatch.split('=')[1];
    if (supportedLocales.includes(cookieLocale)) {
      return cookieLocale;
    }
  }

  // 2. Accept-Language header
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang) {
    // Parse "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7" format
    const langs = acceptLang
      .split(',')
      .map((part) => {
        const [lang, quality] = part.trim().split(';q=');
        return { lang: lang.trim(), q: quality ? parseFloat(quality) : 1.0 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { lang } of langs) {
      if (supportedLocales.includes(lang)) return lang;
      const base = lang.split('-')[0];
      if (supportedLocales.includes(base)) return base;
    }
  }

  // 3. Default
  return defaultLocale;
}

export { COOKIE_NAME } from './constants.js';
