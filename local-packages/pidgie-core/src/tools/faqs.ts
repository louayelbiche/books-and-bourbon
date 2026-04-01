/**
 * FAQs Tool
 *
 * Returns frequently asked questions and answers.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext, FAQ } from '../types/index.js';

export const faqsTool: AgentTool = {
  name: 'get_faqs',
  description: 'Get frequently asked questions and their answers. Can search by keyword or filter by category.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Search term to find relevant FAQs',
      },
      category: {
        type: 'string',
        description: 'Filter FAQs by category',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of FAQs to return (default: 5)',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    let faqs = [...business.faqs];

    // Filter by category
    if (args.category) {
      const category = (args.category as string).toLowerCase();
      faqs = faqs.filter((f) => f.category?.toLowerCase() === category);
    }

    // Search by keywords
    if (args.search) {
      const searchTerm = (args.search as string).toLowerCase();
      faqs = faqs
        .map((faq) => ({
          faq,
          score: calculateRelevance(faq, searchTerm),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((item) => item.faq);
    }

    // Apply limit
    const limit = (args.limit as number) || 5;
    faqs = faqs.slice(0, limit);

    // Format for response
    const formattedFaqs = faqs.map(formatFaq);

    // Get unique categories
    const categories = [...new Set(business.faqs.map((f) => f.category).filter(Boolean))];

    return {
      faqs: formattedFaqs,
      totalCount: faqs.length,
      categories: categories.length > 0 ? categories : undefined,
    };
  },
};

/**
 * Calculate relevance score for search
 */
function calculateRelevance(faq: FAQ, searchTerm: string): number {
  let score = 0;
  const terms = searchTerm.toLowerCase().split(/\s+/);

  for (const term of terms) {
    // Check question
    if (faq.question.toLowerCase().includes(term)) {
      score += 3;
    }

    // Check answer
    if (faq.answer.toLowerCase().includes(term)) {
      score += 1;
    }

    // Check keywords
    if (faq.keywords) {
      for (const keyword of faq.keywords) {
        if (keyword.toLowerCase().includes(term)) {
          score += 2;
        }
      }
    }
  }

  return score;
}

/**
 * Format FAQ for display
 */
function formatFaq(faq: FAQ): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    question: faq.question,
    answer: faq.answer,
  };

  if (faq.category) {
    formatted.category = faq.category;
  }

  return formatted;
}
