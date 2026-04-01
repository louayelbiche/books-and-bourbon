/**
 * Initial Suggestions Generator
 *
 * Generates pre-conversation starter suggestions from scraped data.
 * Locale-aware: generates in the website's detected language.
 */

import type { InitialSuggestionContext } from './types.js';

// Locale-aware suggestion templates
const TEMPLATES: Record<string, Record<string, string>> = {
  en: {
    whatDoYouDo: 'What does {biz} do?',
    whatServices: 'What services do you offer?',
    whatProducts: 'What products do you have?',
    howToBook: 'How do I book an appointment?',
    whatPrices: 'What are your prices?',
    howToStart: 'How can I get started?',
    showFaq: 'Show me your FAQ',
    tellMore: 'Tell me more about you',
    whatSell: 'What does {biz} sell?',
    aboutStore: 'Tell me about the store',
    anyDeals: 'Any deals right now?',
    whatsPopular: "What's popular?",
    discountCodes: 'Any active discount codes?',
    whatsInStock: "What's in stock?",
    tellAbout: 'Tell me about {name}',
    whatCategory: 'What {cat} do you have?',
  },
  fr: {
    whatDoYouDo: 'Que fait {biz} ?',
    whatServices: 'Quels services proposez-vous ?',
    whatProducts: 'Quels produits avez-vous ?',
    howToBook: 'Comment prendre rendez-vous ?',
    whatPrices: 'Quels sont vos tarifs ?',
    howToStart: 'Comment commencer ?',
    showFaq: 'Questions fréquentes',
    tellMore: 'Dites-moi en plus',
    whatSell: 'Que vend {biz} ?',
    aboutStore: 'Parlez-moi de la boutique',
    anyDeals: 'Des promotions en cours ?',
    whatsPopular: 'Quels sont les plus populaires ?',
    discountCodes: 'Des codes promo actifs ?',
    whatsInStock: 'Qu\'avez-vous en stock ?',
    tellAbout: 'Parlez-moi de {name}',
    whatCategory: 'Que proposez-vous en {cat} ?',
  },
  ar: {
    whatDoYouDo: 'ماذا تقدم {biz}؟',
    whatServices: 'ما هي الخدمات المتاحة؟',
    whatProducts: 'ما هي المنتجات المتاحة؟',
    howToBook: 'كيف أحجز موعد؟',
    whatPrices: 'ما هي الأسعار؟',
    howToStart: 'كيف أبدأ؟',
    showFaq: 'الأسئلة الشائعة',
    tellMore: 'أخبرني المزيد',
    whatSell: 'ماذا تبيع {biz}؟',
    aboutStore: 'أخبرني عن المتجر',
    anyDeals: 'هل هناك عروض حالية؟',
    whatsPopular: 'ما هو الأكثر شعبية؟',
    discountCodes: 'هل هناك رموز خصم؟',
    whatsInStock: 'ما المتوفر حالياً؟',
    tellAbout: 'أخبرني عن {name}',
    whatCategory: 'ماذا لديكم في {cat}؟',
  },
  es: {
    whatDoYouDo: 'Que hace {biz}?',
    whatServices: 'Que servicios ofrecen?',
    whatProducts: 'Que productos tienen?',
    howToBook: 'Como reservo una cita?',
    whatPrices: 'Cuales son sus precios?',
    howToStart: 'Como puedo empezar?',
    showFaq: 'Preguntas frecuentes',
    tellMore: 'Cuentenme mas',
    whatSell: 'Que vende {biz}?',
    aboutStore: 'Hablame de la tienda',
    anyDeals: 'Hay ofertas ahora?',
    whatsPopular: 'Que es lo mas popular?',
    discountCodes: 'Hay codigos de descuento?',
    whatsInStock: 'Que hay en stock?',
    tellAbout: 'Hablame de {name}',
    whatCategory: 'Que tienen en {cat}?',
  },
  de: {
    whatDoYouDo: 'Was macht {biz}?',
    whatServices: 'Welche Dienstleistungen bieten Sie an?',
    whatProducts: 'Welche Produkte haben Sie?',
    howToBook: 'Wie buche ich einen Termin?',
    whatPrices: 'Was sind Ihre Preise?',
    howToStart: 'Wie fange ich an?',
    showFaq: 'Haeufig gestellte Fragen',
    tellMore: 'Erzaehlen Sie mir mehr',
    whatSell: 'Was verkauft {biz}?',
    aboutStore: 'Erzaehlen Sie mir vom Geschaeft',
    anyDeals: 'Gibt es aktuelle Angebote?',
    whatsPopular: 'Was ist beliebt?',
    discountCodes: 'Gibt es Rabattcodes?',
    whatsInStock: 'Was ist auf Lager?',
    tellAbout: 'Erzaehlen Sie mir von {name}',
    whatCategory: 'Was haben Sie in {cat}?',
  },
};

function t(locale: string, key: string, vars?: Record<string, string>): string {
  const lang = TEMPLATES[locale] || TEMPLATES.en;
  let text = lang[key] || TEMPLATES.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

/**
 * Generate initial conversation starter suggestions.
 * Locale-aware: generates in the website's detected language.
 */
export function generateInitialSuggestions(context: InitialSuggestionContext): string[] {
  if (context.mode === 'sales') {
    return generateSalesSuggestions(context);
  }
  return generatePidgieSuggestions(context);
}

function generateSalesSuggestions(context: InitialSuggestionContext): string[] {
  const { products = [], businessName, locale = 'en' } = context;
  const suggestions: string[] = [];
  const biz = truncate(businessName, 20);

  if (products.length === 0) {
    return [t(locale, 'whatSell', { biz }), t(locale, 'aboutStore'), t(locale, 'anyDeals')];
  }

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  if (categories.length > 0) {
    suggestions.push(t(locale, 'whatCategory', { cat: categories[0]! }));
  } else {
    suggestions.push(t(locale, 'whatsPopular'));
  }

  const withDiscounts = products.filter((p) => p.discountCode);
  if (withDiscounts.length > 0) {
    suggestions.push(t(locale, 'discountCodes'));
  } else {
    suggestions.push(t(locale, 'anyDeals'));
  }

  const inStock = products.filter((p) => p.inStock);
  if (inStock.length > 0) {
    const name = truncate(inStock[0].name, 30);
    suggestions.push(t(locale, 'tellAbout', { name }));
  } else {
    suggestions.push(t(locale, 'whatsInStock'));
  }

  return suggestions;
}

function generatePidgieSuggestions(context: InitialSuggestionContext): string[] {
  const { signals, businessName, locale = 'en' } = context;
  const suggestions: string[] = [];
  const biz = truncate(businessName, 20);

  if (!signals) {
    return [t(locale, 'whatDoYouDo', { biz }), t(locale, 'howToStart'), t(locale, 'tellMore')];
  }

  if (signals.hasServices) {
    suggestions.push(t(locale, 'whatServices'));
  } else if (signals.hasProducts) {
    suggestions.push(t(locale, 'whatProducts'));
  } else {
    suggestions.push(t(locale, 'whatDoYouDo', { biz }));
  }

  if (signals.hasBooking) {
    suggestions.push(t(locale, 'howToBook'));
  } else if (signals.hasPricing) {
    suggestions.push(t(locale, 'whatPrices'));
  } else {
    suggestions.push(t(locale, 'howToStart'));
  }

  if (signals.hasFaq) {
    suggestions.push(t(locale, 'showFaq'));
  } else {
    suggestions.push(t(locale, 'tellMore'));
  }

  return suggestions;
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
