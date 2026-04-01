/**
 * Proactive Greeting Types
 */

import type { BusinessCategory } from '../types/index.js';

/**
 * Greeting context
 */
export interface GreetingContext {
  /** Current time */
  currentTime: Date;
  /** Timezone */
  timezone: string;
  /** Is returning visitor */
  isReturningVisitor: boolean;
  /** Visit count (if known) */
  visitCount?: number;
  /** Last visit date (if known) */
  lastVisitDate?: Date;
  /** Referrer source */
  referrer?: string;
  /** Current page/section */
  currentPage?: string;
  /** User agent (for device detection) */
  userAgent?: string;
  /** Is business currently open */
  isBusinessOpen?: boolean;
  /** Custom context data */
  customData?: Record<string, unknown>;
}

/**
 * Suggested action for greeting
 */
export interface GreetingSuggestion {
  /** Suggestion ID */
  id: string;
  /** Display text */
  text: string;
  /** Action type */
  type: 'question' | 'action' | 'link';
  /** Value to send if clicked */
  value: string;
  /** Priority (higher = more prominent) */
  priority: number;
  /** Icon name (optional) */
  icon?: string;
}

/**
 * Proactive greeting response
 */
export interface ProactiveGreeting {
  /** Main greeting text */
  message: string;
  /** Secondary message (optional) */
  subMessage?: string;
  /** Suggested actions/questions */
  suggestions: GreetingSuggestion[];
  /** Greeting variant used */
  variant: GreetingVariant;
  /** Time of day */
  timeOfDay: TimeOfDay;
  /** Should show notification badge */
  showBadge?: boolean;
  /** Custom CSS class */
  cssClass?: string;
}

/**
 * Time of day categories
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Greeting variants
 */
export type GreetingVariant =
  | 'default'
  | 'returning'
  | 'first_time'
  | 'after_hours'
  | 'special_event'
  | 'promotional';

/**
 * Greeting configuration per business category
 */
export interface CategoryGreetingConfig {
  /** Default suggestions for this category */
  defaultSuggestions: GreetingSuggestion[];
  /** Time-based greeting templates */
  greetings: {
    morning: string[];
    afternoon: string[];
    evening: string[];
    night: string[];
  };
  /** After-hours message */
  afterHoursMessage: string;
  /** Returning visitor templates */
  returningTemplates: string[];
}

/**
 * Greeting generator configuration
 */
export interface GreetingGeneratorConfig {
  /** Business name */
  businessName: string;
  /** Business category */
  businessCategory: BusinessCategory;
  /** Custom greeting (overrides auto-generated) */
  customGreeting?: string;
  /** Custom suggestions */
  customSuggestions?: GreetingSuggestion[];
  /** Include time-based greeting */
  useTimeBasedGreeting?: boolean;
  /** Personalize for returning visitors */
  personalizeForReturning?: boolean;
  /** Show suggestions */
  showSuggestions?: boolean;
  /** Maximum suggestions to show */
  maxSuggestions?: number;
}
