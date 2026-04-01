/**
 * Proactive Greeting Generator
 *
 * Generates context-aware greetings based on time, visitor status, and business type.
 */

import type { BusinessCategory } from '../types/index.js';
import type {
  GreetingContext,
  GreetingSuggestion,
  ProactiveGreeting,
  TimeOfDay,
  GreetingVariant,
  CategoryGreetingConfig,
  GreetingGeneratorConfig,
} from './types.js';

/**
 * Category-specific greeting configurations
 */
const CATEGORY_CONFIGS: Record<BusinessCategory, CategoryGreetingConfig> = {
  restaurant: {
    greetings: {
      morning: [
        'Good morning! Ready to start your day with something delicious?',
        'Rise and shine! Looking for breakfast options?',
        'Good morning! What can we prepare for you today?',
      ],
      afternoon: [
        'Good afternoon! Hungry for lunch?',
        'Hi there! Looking for a tasty lunch?',
        'Good afternoon! Let me help you find the perfect meal.',
      ],
      evening: [
        'Good evening! Ready to explore our dinner menu?',
        'Welcome! Looking for dinner plans tonight?',
        'Good evening! What sounds good for dinner?',
      ],
      night: [
        'Hey there! Late night cravings?',
        'Hi! Looking for a late-night bite?',
        'Welcome! Still serving delicious food.',
      ],
    },
    afterHoursMessage: "We're currently closed, but I can help you plan your next visit!",
    returningTemplates: [
      'Welcome back! Ready to order your favorites?',
      'Great to see you again! Same as last time, or trying something new?',
      'Welcome back! I can help you with your order.',
    ],
    defaultSuggestions: [
      { id: 'menu', text: 'View Menu', type: 'question', value: 'What do you have on the menu?', priority: 10 },
      { id: 'hours', text: 'Hours', type: 'question', value: 'What are your hours today?', priority: 8 },
      { id: 'order', text: 'Place Order', type: 'action', value: 'I want to place an order', priority: 9 },
      { id: 'specials', text: 'Specials', type: 'question', value: 'Do you have any specials today?', priority: 7 },
    ],
  },
  retail: {
    greetings: {
      morning: [
        'Good morning! Looking for something special today?',
        'Hello! How can I help you find what you need?',
        'Good morning! Ready to browse our collection?',
      ],
      afternoon: [
        'Good afternoon! What can I help you find?',
        'Hi there! Exploring our latest arrivals?',
        'Good afternoon! Let me assist you today.',
      ],
      evening: [
        'Good evening! Still time to find something great!',
        'Welcome! How can I help you this evening?',
        'Good evening! Looking for anything specific?',
      ],
      night: [
        'Hi there! Shopping late? I can help!',
        'Welcome! Let me know what you need.',
        'Hello! How can I assist you tonight?',
      ],
    },
    afterHoursMessage: "We're closed now, but feel free to browse! I can answer questions.",
    returningTemplates: [
      'Welcome back! Looking for more great finds?',
      'Hey there! Back for more? Let me help!',
      'Nice to see you again! What can I help you find?',
    ],
    defaultSuggestions: [
      { id: 'products', text: 'Browse Products', type: 'question', value: 'What products do you have?', priority: 10 },
      { id: 'deals', text: 'Deals', type: 'question', value: 'Any deals or promotions?', priority: 9 },
      { id: 'hours', text: 'Store Hours', type: 'question', value: 'What are your store hours?', priority: 7 },
      { id: 'location', text: 'Location', type: 'question', value: 'Where are you located?', priority: 6 },
    ],
  },
  service: {
    greetings: {
      morning: [
        'Good morning! How can I assist you today?',
        'Hello! Ready to help with your needs.',
        'Good morning! What service can I help you with?',
      ],
      afternoon: [
        'Good afternoon! How may I help you?',
        'Hi! Looking to schedule a service?',
        'Good afternoon! I can help you get started.',
      ],
      evening: [
        'Good evening! Still here to help!',
        'Welcome! How can I assist you this evening?',
        'Good evening! What can I do for you?',
      ],
      night: [
        'Hi there! How can I help tonight?',
        'Welcome! Let me know what you need.',
        'Hello! I can assist you anytime.',
      ],
    },
    afterHoursMessage: "We're closed, but I can help you schedule an appointment!",
    returningTemplates: [
      'Welcome back! Need to book another appointment?',
      'Great to see you again! How can I help today?',
      'Hello again! Ready to assist you.',
    ],
    defaultSuggestions: [
      { id: 'book', text: 'Book Appointment', type: 'action', value: 'I want to book an appointment', priority: 10 },
      { id: 'services', text: 'Our Services', type: 'question', value: 'What services do you offer?', priority: 9 },
      { id: 'pricing', text: 'Pricing', type: 'question', value: 'How much do your services cost?', priority: 8 },
      { id: 'hours', text: 'Hours', type: 'question', value: 'What are your business hours?', priority: 6 },
    ],
  },
  hotel: {
    greetings: {
      morning: [
        'Good morning! Planning a getaway?',
        'Hello! Looking for the perfect stay?',
        'Good morning! How can I help with your booking?',
      ],
      afternoon: [
        'Good afternoon! Ready to plan your trip?',
        'Hi there! Searching for accommodations?',
        'Good afternoon! Let me help you find a room.',
      ],
      evening: [
        'Good evening! Planning a stay with us?',
        'Welcome! Looking to make a reservation?',
        'Good evening! How may I assist you?',
      ],
      night: [
        'Hello! Need a room for tonight?',
        'Hi! Late arrival? I can help!',
        'Welcome! Let me check availability for you.',
      ],
    },
    afterHoursMessage: 'Our front desk is always available! How can I help?',
    returningTemplates: [
      'Welcome back! Planning another visit?',
      'Great to see you again! Ready to book your next stay?',
      'Hello again! Let me help with your reservation.',
    ],
    defaultSuggestions: [
      { id: 'book', text: 'Book a Room', type: 'action', value: 'I want to book a room', priority: 10 },
      { id: 'availability', text: 'Check Availability', type: 'question', value: 'What rooms are available?', priority: 9 },
      { id: 'amenities', text: 'Amenities', type: 'question', value: 'What amenities do you offer?', priority: 7 },
      { id: 'rates', text: 'Rates', type: 'question', value: 'What are your room rates?', priority: 8 },
    ],
  },
  healthcare: {
    greetings: {
      morning: [
        'Good morning! How can I help you today?',
        'Hello! Need assistance with an appointment?',
        'Good morning! I can help with your healthcare needs.',
      ],
      afternoon: [
        'Good afternoon! How may I assist you?',
        'Hi! Looking to schedule a visit?',
        'Good afternoon! I can help you get started.',
      ],
      evening: [
        'Good evening! How can I help?',
        'Welcome! Need to book an appointment?',
        'Good evening! I can assist with your inquiry.',
      ],
      night: [
        'Hello! I can help you schedule care.',
        'Hi there! Need assistance tonight?',
        'Welcome! Let me help you.',
      ],
    },
    afterHoursMessage: 'For emergencies, please call 911. I can help schedule appointments.',
    returningTemplates: [
      'Welcome back! Need to schedule a follow-up?',
      'Hello again! How can I assist you today?',
      'Good to see you! Ready to help.',
    ],
    defaultSuggestions: [
      { id: 'appointment', text: 'Schedule Appointment', type: 'action', value: 'I need to schedule an appointment', priority: 10 },
      { id: 'services', text: 'Services', type: 'question', value: 'What services do you provide?', priority: 8 },
      { id: 'hours', text: 'Office Hours', type: 'question', value: 'What are your office hours?', priority: 7 },
      { id: 'insurance', text: 'Insurance', type: 'question', value: 'What insurance do you accept?', priority: 6 },
    ],
  },
  fitness: {
    greetings: {
      morning: [
        'Good morning! Ready to crush your workout?',
        'Hello! Time to get moving!',
        'Good morning! What fitness goals can I help with?',
      ],
      afternoon: [
        'Good afternoon! Looking for a workout?',
        'Hi there! Ready to hit the gym?',
        'Good afternoon! Let me help you get started.',
      ],
      evening: [
        'Good evening! Ready for an evening workout?',
        'Welcome! Time to work up a sweat?',
        'Good evening! What can I help you with?',
      ],
      night: [
        'Hey there! Late night workout?',
        'Welcome! Ready to train?',
        'Hi! Let me help you with your fitness goals.',
      ],
    },
    afterHoursMessage: "We're closed now, but I can help you plan your next visit!",
    returningTemplates: [
      'Welcome back! Ready to work out?',
      'Great to see you again! What are we training today?',
      'Hey! Back for more? Let me help!',
    ],
    defaultSuggestions: [
      { id: 'classes', text: 'Classes', type: 'question', value: 'What classes do you offer?', priority: 10 },
      { id: 'membership', text: 'Membership', type: 'question', value: 'Tell me about membership options', priority: 9 },
      { id: 'hours', text: 'Hours', type: 'question', value: 'What are your hours?', priority: 7 },
      { id: 'pricing', text: 'Pricing', type: 'question', value: 'How much does membership cost?', priority: 8 },
    ],
  },
  salon: {
    greetings: {
      morning: [
        'Good morning! Ready for a fresh look?',
        'Hello! Looking for beauty services?',
        'Good morning! How can I help you today?',
      ],
      afternoon: [
        'Good afternoon! Time for some self-care?',
        'Hi! Looking to book a treatment?',
        'Good afternoon! Let me help you look fabulous.',
      ],
      evening: [
        'Good evening! Ready for a pampering session?',
        'Welcome! Need a last-minute appointment?',
        'Good evening! What service can I help with?',
      ],
      night: [
        'Hello! Planning your next appointment?',
        'Hi there! How can I help?',
        'Welcome! Let me assist you.',
      ],
    },
    afterHoursMessage: "We're closed now, but I can help you book your next appointment!",
    returningTemplates: [
      'Welcome back! Time for another treatment?',
      'Good to see you again! Same service as before?',
      'Hello again! Ready to look fabulous?',
    ],
    defaultSuggestions: [
      { id: 'book', text: 'Book Appointment', type: 'action', value: 'I want to book an appointment', priority: 10 },
      { id: 'services', text: 'Services', type: 'question', value: 'What services do you offer?', priority: 9 },
      { id: 'pricing', text: 'Pricing', type: 'question', value: 'What are your prices?', priority: 8 },
      { id: 'hours', text: 'Hours', type: 'question', value: 'What are your hours?', priority: 6 },
    ],
  },
  other: {
    greetings: {
      morning: [
        'Good morning! How can I help you today?',
        'Hello! What can I assist you with?',
        'Good morning! I\'m here to help.',
      ],
      afternoon: [
        'Good afternoon! How may I help?',
        'Hi there! What brings you here today?',
        'Good afternoon! I can answer your questions.',
      ],
      evening: [
        'Good evening! How can I assist?',
        'Welcome! What can I do for you?',
        'Good evening! I\'m here to help.',
      ],
      night: [
        'Hello! How can I help tonight?',
        'Hi! What can I assist you with?',
        'Welcome! Let me know how I can help.',
      ],
    },
    afterHoursMessage: "We're currently closed, but I can still help with questions!",
    returningTemplates: [
      'Welcome back! How can I help?',
      'Good to see you again!',
      'Hello again! I\'m here to assist.',
    ],
    defaultSuggestions: [
      { id: 'help', text: 'Get Help', type: 'question', value: 'I need help', priority: 10 },
      { id: 'hours', text: 'Hours', type: 'question', value: 'What are your hours?', priority: 8 },
      { id: 'contact', text: 'Contact', type: 'question', value: 'How can I contact you?', priority: 7 },
      { id: 'info', text: 'More Info', type: 'question', value: 'Tell me more about your business', priority: 6 },
    ],
  },
};

/**
 * Greeting Generator class
 */
export class GreetingGenerator {
  private config: GreetingGeneratorConfig;
  private categoryConfig: CategoryGreetingConfig;

  constructor(config: GreetingGeneratorConfig) {
    this.config = {
      useTimeBasedGreeting: true,
      personalizeForReturning: true,
      showSuggestions: true,
      maxSuggestions: 4,
      ...config,
    };
    this.categoryConfig = CATEGORY_CONFIGS[config.businessCategory] || CATEGORY_CONFIGS.other;
  }

  /**
   * Generate a proactive greeting based on context
   */
  generate(context: GreetingContext): ProactiveGreeting {
    const timeOfDay = this.getTimeOfDay(context.currentTime, context.timezone);
    const variant = this.determineVariant(context);
    const message = this.selectMessage(context, timeOfDay, variant);
    const suggestions = this.selectSuggestions(context);

    return {
      message,
      suggestions,
      variant,
      timeOfDay,
      subMessage: this.getSubMessage(context, variant),
    };
  }

  /**
   * Get time of day from current time
   */
  private getTimeOfDay(currentTime: Date, timezone: string): TimeOfDay {
    // Get hour in the business timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(currentTime), 10);

    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Determine greeting variant based on context
   */
  private determineVariant(context: GreetingContext): GreetingVariant {
    // Check for after hours
    if (context.isBusinessOpen === false) {
      return 'after_hours';
    }

    // Check for returning visitor
    if (this.config.personalizeForReturning && context.isReturningVisitor) {
      return 'returning';
    }

    // First time visitor
    if (context.visitCount === 1) {
      return 'first_time';
    }

    return 'default';
  }

  /**
   * Select appropriate message based on context
   */
  private selectMessage(
    context: GreetingContext,
    timeOfDay: TimeOfDay,
    variant: GreetingVariant
  ): string {
    // Custom greeting overrides everything
    if (this.config.customGreeting) {
      return this.personalizeMessage(this.config.customGreeting, context);
    }

    // After hours message
    if (variant === 'after_hours') {
      return this.personalizeMessage(this.categoryConfig.afterHoursMessage, context);
    }

    // Returning visitor
    if (variant === 'returning' && this.categoryConfig.returningTemplates.length > 0) {
      const template = this.randomItem(this.categoryConfig.returningTemplates);
      return this.personalizeMessage(template, context);
    }

    // Time-based greeting
    if (this.config.useTimeBasedGreeting) {
      const templates = this.categoryConfig.greetings[timeOfDay];
      if (templates.length > 0) {
        const template = this.randomItem(templates);
        return this.personalizeMessage(template, context);
      }
    }

    // Default fallback
    return `Hello! Welcome to ${this.config.businessName}. How can I help you today?`;
  }

  /**
   * Get optional sub-message
   */
  private getSubMessage(context: GreetingContext, variant: GreetingVariant): string | undefined {
    if (variant === 'after_hours') {
      return 'I can still help with questions and planning.';
    }

    if (variant === 'returning' && context.visitCount && context.visitCount > 5) {
      return 'Thanks for being a loyal visitor!';
    }

    return undefined;
  }

  /**
   * Select suggestions based on context
   */
  private selectSuggestions(context: GreetingContext): GreetingSuggestion[] {
    if (!this.config.showSuggestions) {
      return [];
    }

    // Start with custom suggestions if provided
    let suggestions: GreetingSuggestion[] = this.config.customSuggestions
      ? [...this.config.customSuggestions]
      : [...this.categoryConfig.defaultSuggestions];

    // Adjust priorities based on context
    suggestions = this.adjustSuggestionPriorities(suggestions, context);

    // Sort by priority and limit
    suggestions.sort((a, b) => b.priority - a.priority);
    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Adjust suggestion priorities based on context
   */
  private adjustSuggestionPriorities(
    suggestions: GreetingSuggestion[],
    context: GreetingContext
  ): GreetingSuggestion[] {
    return suggestions.map((suggestion) => {
      const adjusted = { ...suggestion };

      // Boost booking/order suggestions for returning visitors
      if (context.isReturningVisitor) {
        if (suggestion.type === 'action') {
          adjusted.priority += 2;
        }
      }

      // Boost hours-related suggestions if after hours
      if (context.isBusinessOpen === false) {
        if (suggestion.id === 'hours' || suggestion.text.toLowerCase().includes('hour')) {
          adjusted.priority += 3;
        }
      }

      // Boost based on current page context
      if (context.currentPage) {
        const page = context.currentPage.toLowerCase();
        if (page.includes('menu') && suggestion.id === 'order') {
          adjusted.priority += 2;
        }
        if (page.includes('room') && suggestion.id === 'book') {
          adjusted.priority += 2;
        }
      }

      return adjusted;
    });
  }

  /**
   * Personalize message with context data
   */
  private personalizeMessage(template: string, context: GreetingContext): string {
    let message = template;

    // Replace placeholders (if any custom templates use them)
    message = message.replace(/{businessName}/g, this.config.businessName);

    if (context.visitCount) {
      message = message.replace(/{visitCount}/g, context.visitCount.toString());
    }

    return message;
  }

  /**
   * Get random item from array
   */
  private randomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }

  /**
   * Get default greeting (static, without context)
   */
  getDefaultGreeting(): string {
    return `Hello! Welcome to ${this.config.businessName}. How can I help you today?`;
  }

  /**
   * Get category-specific suggestions
   */
  getCategorySuggestions(): GreetingSuggestion[] {
    return [...this.categoryConfig.defaultSuggestions];
  }
}

/**
 * Create a quick greeting without full context
 */
export function createQuickGreeting(
  businessName: string,
  businessCategory: BusinessCategory,
  timezone: string = 'America/Los_Angeles'
): ProactiveGreeting {
  const generator = new GreetingGenerator({
    businessName,
    businessCategory,
  });

  return generator.generate({
    currentTime: new Date(),
    timezone,
    isReturningVisitor: false,
  });
}
