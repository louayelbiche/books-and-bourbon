/**
 * Card Chrome Labels (i18n)
 *
 * Translatable UI labels for card structural elements (chrome).
 * These are NOT the card data content (which comes from DB in the user's language).
 * These are the surrounding labels like "Services", "Products", "Contact", etc.
 *
 * The card components accept an optional `labels` prop to override defaults.
 * Default labels are English.
 */

/**
 * Labels for the BusinessBreakdownCard component.
 */
export interface BusinessBreakdownLabels {
  services: string;
  products: string;
  todaysHours: string;
  contact: string;
  faqAvailable: string;
  faqsAvailable: string;
  closedToday: string;
  emptyState: string;
  moreItems: string;
}

/**
 * Generic card chrome labels used across multiple card types.
 */
export interface CardChromeLabels {
  pinToPanel: string;
  unpinFromPanel: string;
  removeFromPanel: string;
  emptyPanel: string;
  loading: string;
  error: string;
  retry: string;
}

/**
 * All card chrome labels combined.
 */
export interface AllCardLabels {
  businessBreakdown: BusinessBreakdownLabels;
  chrome: CardChromeLabels;
}

/**
 * Default English labels.
 */
export const DEFAULT_CARD_LABELS: AllCardLabels = {
  businessBreakdown: {
    services: 'Services',
    products: 'Products',
    todaysHours: "Today's Hours",
    contact: 'Contact',
    faqAvailable: '{count} FAQ available',
    faqsAvailable: '{count} FAQs available',
    closedToday: 'Closed today',
    emptyState: 'Business details will appear here as data loads',
    moreItems: '+{count} more',
  },
  chrome: {
    pinToPanel: 'Pin to panel',
    unpinFromPanel: 'Unpin from panel',
    removeFromPanel: 'Remove from panel',
    emptyPanel: 'Artifacts will appear here',
    loading: 'Loading...',
    error: 'Something went wrong',
    retry: 'Retry',
  },
};

/**
 * French labels.
 */
export const FR_CARD_LABELS: AllCardLabels = {
  businessBreakdown: {
    services: 'Services',
    products: 'Produits',
    todaysHours: "Horaires du jour",
    contact: 'Contact',
    faqAvailable: '{count} FAQ disponible',
    faqsAvailable: '{count} FAQs disponibles',
    closedToday: "Fermé aujourd'hui",
    emptyState: "Les détails de l'entreprise apparaîtront ici au chargement",
    moreItems: '+{count} de plus',
  },
  chrome: {
    pinToPanel: 'Épingler au panneau',
    unpinFromPanel: 'Détacher du panneau',
    removeFromPanel: 'Retirer du panneau',
    emptyPanel: 'Les artefacts apparaîtront ici',
    loading: 'Chargement...',
    error: "Quelque chose s'est mal passé",
    retry: 'Réessayer',
  },
};

/**
 * Arabic labels.
 */
export const AR_CARD_LABELS: AllCardLabels = {
  businessBreakdown: {
    services: 'الخدمات',
    products: 'المنتجات',
    todaysHours: 'ساعات العمل اليوم',
    contact: 'التواصل',
    faqAvailable: '{count} سؤال شائع متاح',
    faqsAvailable: '{count} أسئلة شائعة متاحة',
    closedToday: 'مغلق اليوم',
    emptyState: 'ستظهر تفاصيل النشاط التجاري هنا عند تحميل البيانات',
    moreItems: '+{count} إضافي',
  },
  chrome: {
    pinToPanel: 'تثبيت في اللوحة',
    unpinFromPanel: 'إلغاء التثبيت من اللوحة',
    removeFromPanel: 'إزالة من اللوحة',
    emptyPanel: 'ستظهر العناصر هنا',
    loading: 'جارٍ التحميل...',
    error: 'حدث خطأ ما',
    retry: 'إعادة المحاولة',
  },
};

/**
 * Label registry by locale code.
 */
const LABEL_REGISTRY: Record<string, AllCardLabels> = {
  en: DEFAULT_CARD_LABELS,
  fr: FR_CARD_LABELS,
  ar: AR_CARD_LABELS,
};

/**
 * Get card labels for a given locale.
 * Falls back to English if locale is not supported.
 */
export function getCardLabels(locale: string): AllCardLabels {
  return LABEL_REGISTRY[locale] ?? DEFAULT_CARD_LABELS;
}

/**
 * Interpolate a label template with values.
 * Replaces {key} placeholders with corresponding values.
 *
 * @example
 * interpolateLabel('{count} FAQs available', { count: 5 })
 * // => '5 FAQs available'
 */
export function interpolateLabel(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}
