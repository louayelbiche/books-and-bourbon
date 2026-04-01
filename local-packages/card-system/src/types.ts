// === Card Data ===

export interface ChatCard {
  id: string;
  type: CardType;
  title: string;
  image?: string;
  subtitle?: string;
  description?: string;
  url: string;
  availability?: CardAvailability;
  variants?: CardVariant[];
  metadata?: Record<string, unknown>;
  generatedAt: number;
}

export type CardType = 'product' | 'event' | 'service' | 'page' | 'booking_confirmation';

export type CardAvailability = 'available' | 'low_stock' | 'sold_out';

export interface CardVariant {
  name: string;
  options: string[];
  selected?: string;
}

// === Actions ===

export interface ChatAction {
  id: string;
  label: string;
  type: ActionType;
  payload: string;
  style?: 'primary' | 'secondary' | 'ghost';
}

export type ActionType = 'navigate' | 'message' | 'api_call';

// === Structured Response ===

export interface StructuredChatResponse {
  text: string;
  cards?: ChatCard[];
  actions?: ChatAction[];
  suggestions?: string[];
}

// === Theme ===

export interface CardTheme {
  card: {
    bg: string;
    border: string;
    radius: string;
    shadow: string;
    hoverBorder: string;
  };
  cardImage: {
    bg: string;
    fallbackBg: string;
    fallbackText: string;
    aspectRatio: string;
  };
  cardTitle: {
    color: string;
    fontSize: string;
  };
  cardSubtitle: {
    color: string;
    fontSize: string;
  };
  cardVariant: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    activeBorder: string;
  };
  cardStaleness: {
    color: string;
    fontSize: string;
  };
  action: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryText: string;
    border: string;
    hoverBg: string;
  };
}

// === Configuration ===

export interface CardConfig {
  maxCardsPerMessage: number;
  expandSteps: number[];
  stalenessThresholdMs: number;
  imageProxy?: {
    enabled: boolean;
    baseUrl: string;
  };
  clickBehavior: 'new_tab' | 'same_tab' | 'auto';
  enableVariantSelectors: boolean;
  enableAddToCart: boolean;
  /** Text shown as a placeholder when a card has no image. Used for demo/preview disclaimers. */
  imagePlaceholderText?: string;
}
