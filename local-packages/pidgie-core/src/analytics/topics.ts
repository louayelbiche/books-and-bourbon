/**
 * Topic Extraction
 *
 * Extracts topics from conversation messages using keyword matching.
 */

/**
 * Extracted topic
 */
export interface ExtractedTopic {
  /** Topic name */
  name: string;
  /** Topic category */
  category: TopicCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Keywords that matched */
  matchedKeywords: string[];
}

/**
 * Topic categories
 */
export type TopicCategory =
  | 'hours_location'
  | 'products_services'
  | 'pricing'
  | 'booking_reservation'
  | 'support_help'
  | 'feedback_complaint'
  | 'general_inquiry'
  | 'other';

/**
 * Topic category definitions with keywords
 */
export const TOPIC_CATEGORIES: Record<TopicCategory, { keywords: string[]; weight: number }> = {
  hours_location: {
    keywords: [
      'hours', 'open', 'close', 'closing', 'opening', 'time', 'when',
      'location', 'address', 'where', 'directions', 'parking', 'map',
      'today', 'tomorrow', 'weekend', 'sunday', 'monday', 'tuesday',
      'wednesday', 'thursday', 'friday', 'saturday',
    ],
    weight: 1.0,
  },
  products_services: {
    keywords: [
      'product', 'item', 'menu', 'service', 'offer', 'available',
      'have', 'sell', 'provide', 'options', 'selection', 'catalog',
      'what do you', 'what can', 'vegetarian', 'vegan', 'gluten',
      'specialty', 'popular', 'recommend', 'best',
    ],
    weight: 1.0,
  },
  pricing: {
    keywords: [
      'price', 'cost', 'how much', 'expensive', 'cheap', 'affordable',
      'discount', 'deal', 'promotion', 'sale', 'offer', 'coupon',
      'free', 'payment', 'pay', 'card', 'cash', 'fee',
    ],
    weight: 1.0,
  },
  booking_reservation: {
    keywords: [
      'book', 'booking', 'reserve', 'reservation', 'appointment',
      'schedule', 'available', 'availability', 'slot', 'table',
      'room', 'cancel', 'reschedule', 'confirm', 'party', 'guest',
      'people', 'person', 'seats',
    ],
    weight: 1.2, // Higher weight for booking intent
  },
  support_help: {
    keywords: [
      'help', 'support', 'question', 'issue', 'problem', 'trouble',
      'not working', 'broken', 'error', 'wrong', 'fix', 'contact',
      'speak', 'talk', 'human', 'manager', 'phone', 'email', 'call',
    ],
    weight: 1.1,
  },
  feedback_complaint: {
    keywords: [
      'complaint', 'complain', 'unhappy', 'disappointed', 'bad',
      'terrible', 'awful', 'worst', 'feedback', 'review', 'suggest',
      'improve', 'better', 'thank', 'great', 'amazing', 'excellent',
      'love', 'appreciate',
    ],
    weight: 1.3, // Higher weight for feedback
  },
  general_inquiry: {
    keywords: [
      'info', 'information', 'about', 'tell me', 'what is', 'who',
      'why', 'how', 'explain', 'understand', 'learn', 'know',
      'describe', 'detail',
    ],
    weight: 0.8, // Lower weight for generic
  },
  other: {
    keywords: [],
    weight: 0.5,
  },
};

/**
 * Topic Extractor class
 */
export class TopicExtractor {
  private minConfidence: number;

  constructor(options: { minConfidence?: number } = {}) {
    this.minConfidence = options.minConfidence ?? 0.3;
  }

  /**
   * Extract topics from a message
   */
  extractFromMessage(message: string): ExtractedTopic[] {
    const topics: ExtractedTopic[] = [];
    const normalizedMessage = message.toLowerCase();
    const words = normalizedMessage.split(/\s+/);

    for (const [category, config] of Object.entries(TOPIC_CATEGORIES)) {
      if (category === 'other') continue;

      const matchedKeywords: string[] = [];
      let matchScore = 0;

      for (const keyword of config.keywords) {
        // Check for exact word match or phrase match
        if (keyword.includes(' ')) {
          // Phrase matching
          if (normalizedMessage.includes(keyword)) {
            matchedKeywords.push(keyword);
            matchScore += 2; // Phrases worth more
          }
        } else {
          // Word matching
          if (words.includes(keyword) || normalizedMessage.includes(keyword)) {
            matchedKeywords.push(keyword);
            matchScore += 1;
          }
        }
      }

      if (matchedKeywords.length > 0) {
        // Calculate confidence based on matches and category weight
        const maxPossibleScore = Math.min(config.keywords.length, 5);
        const confidence = Math.min(
          ((matchScore / maxPossibleScore) * config.weight),
          1.0
        );

        if (confidence >= this.minConfidence) {
          topics.push({
            name: formatTopicName(category as TopicCategory),
            category: category as TopicCategory,
            confidence: Math.round(confidence * 100) / 100,
            matchedKeywords,
          });
        }
      }
    }

    // Sort by confidence
    topics.sort((a, b) => b.confidence - a.confidence);

    return topics;
  }

  /**
   * Extract topics from a conversation (multiple messages)
   */
  extractFromConversation(messages: string[]): ExtractedTopic[] {
    const allTopics: Map<TopicCategory, ExtractedTopic> = new Map();

    for (const message of messages) {
      const messageTopics = this.extractFromMessage(message);

      for (const topic of messageTopics) {
        const existing = allTopics.get(topic.category);

        if (existing) {
          // Merge: keep highest confidence and combine keywords
          existing.confidence = Math.max(existing.confidence, topic.confidence);
          const newKeywords = topic.matchedKeywords.filter(
            (k) => !existing.matchedKeywords.includes(k)
          );
          existing.matchedKeywords.push(...newKeywords);
        } else {
          allTopics.set(topic.category, { ...topic });
        }
      }
    }

    return Array.from(allTopics.values()).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get primary topic from a conversation
   */
  getPrimaryTopic(messages: string[]): ExtractedTopic | null {
    const topics = this.extractFromConversation(messages);
    return topics.length > 0 ? topics[0] : null;
  }

  /**
   * Get topic names only
   */
  getTopicNames(messages: string[]): string[] {
    return this.extractFromConversation(messages).map((t) => t.name);
  }
}

/**
 * Format topic category to display name
 */
function formatTopicName(category: TopicCategory): string {
  const names: Record<TopicCategory, string> = {
    hours_location: 'Hours & Location',
    products_services: 'Products & Services',
    pricing: 'Pricing & Deals',
    booking_reservation: 'Booking & Reservations',
    support_help: 'Support & Help',
    feedback_complaint: 'Feedback',
    general_inquiry: 'General Inquiry',
    other: 'Other',
  };
  return names[category];
}
