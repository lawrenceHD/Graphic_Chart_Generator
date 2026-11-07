import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import en from '../../messages/en.json' with { type: 'json' };
import fr from '../../messages/fr.json' with { type: 'json' };
import productEn from '../../messages/product.en.json' with { type: 'json' };
import productFr from '../../messages/product.fr.json' with { type: 'json' };
import { LOCALE_COOKIE, resolveLocale, type Locale } from './locale';

// product.* holds the namespaces of the product screens (home, pricing, auth, dashboard); distinct
// top-level names, so merging never overrides a studio message.
const MESSAGES = {
  fr: { ...fr, ...productFr },
  en: { ...en, ...productEn },
} satisfies Record<Locale, object>;

// No locale segment in the URLs (French routes, 09 §7): the locale comes from the saved choice,
// then the browser languages.
export default getRequestConfig(async () => {
  const locale = resolveLocale(
    (await cookies()).get(LOCALE_COOKIE)?.value,
    (await headers()).get('accept-language'),
  );
  return { locale, messages: MESSAGES[locale] };
});
