import type { CardConfig, CardTheme } from '../types.js';

export const DEFAULT_CARD_CONFIG: CardConfig = {
  maxCardsPerMessage: 3,
  expandSteps: [5, 8],
  stalenessThresholdMs: 3600000,
  clickBehavior: 'auto',
  enableVariantSelectors: false,
  enableAddToCart: false,
};

export const DEFAULT_CARD_THEME: CardTheme = {
  card: {
    bg: '#ffffff',
    border: '#e5e7eb',
    radius: '10px',
    shadow: '0 1px 3px rgba(0,0,0,0.08)',
    hoverBorder: '#d1d5db',
  },
  cardImage: {
    bg: '#f3f4f6',
    fallbackBg: '#f9fafb',
    fallbackText: '#9ca3af',
    aspectRatio: '16/9',
  },
  cardTitle: {
    color: '#111827',
    fontSize: '13px',
  },
  cardSubtitle: {
    color: '#6b7280',
    fontSize: '11px',
  },
  cardVariant: {
    bg: '#f3f4f6',
    border: '#e5e7eb',
    text: '#374151',
    activeBg: '#111827',
    activeBorder: '#111827',
  },
  cardStaleness: {
    color: '#9ca3af',
    fontSize: '11px',
  },
  action: {
    primaryBg: '#111827',
    primaryText: '#ffffff',
    secondaryBg: 'transparent',
    secondaryText: '#111827',
    border: '#d1d5db',
    hoverBg: '#1f2937',
  },
};
