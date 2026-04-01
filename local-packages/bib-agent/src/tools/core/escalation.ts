/**
 * Escalation Core Tool
 *
 * Registers request escalation as a core tool available to all BIB agents.
 * When the AI cannot answer a question, it calls submit_request to capture
 * the visitor's question and context for merchant follow-up.
 *
 * Uses @runwell/request-escalation under the hood.
 */

import {
  PrismaRequestStore,
  type CreateRequestInput,
} from '@runwell/request-escalation';
import type { BibTool, BibToolContext } from '../types.js';

export const escalationTool: BibTool = {
  name: 'submit_request',
  description:
    'Submit an escalation request when you cannot confidently answer a question. The merchant will see this in their dashboard and follow up with the visitor.',
  parameters: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The original question the visitor asked',
      },
      context: {
        type: 'string',
        description:
          'Summary of what you already told the visitor and why you are escalating',
      },
      visitor_name: {
        type: 'string',
        description:
          "The visitor's name, if they shared it during the conversation",
      },
      visitor_email: {
        type: 'string',
        description:
          "The visitor's email, if they shared it during the conversation",
      },
      visitor_phone: {
        type: 'string',
        description:
          "The visitor's phone, if they shared it during the conversation",
      },
    },
    required: ['question'],
  },
  tier: 'core',

  async execute(
    args: Record<string, unknown>,
    ctx: BibToolContext
  ): Promise<unknown> {
    if (!ctx.prisma) {
      return {
        status: 'error',
        message: 'Database not available for escalation requests.',
      };
    }

    const store = new PrismaRequestStore(ctx.prisma);

    const visitorInfo = {
      name: (args.visitor_name as string) || undefined,
      email: (args.visitor_email as string) || undefined,
      phone: (args.visitor_phone as string) || undefined,
    };

    const hasVisitorInfo =
      visitorInfo.name || visitorInfo.email || visitorInfo.phone;

    const input: CreateRequestInput = {
      tenantId: ctx.tenantId,
      question: args.question as string,
      botContext: (args.context as string) || undefined,
      visitorInfo: hasVisitorInfo ? visitorInfo : undefined,
      source: 'bib-agent',
      visitorId: (ctx.agentState?.visitorId as string) || undefined,
      conversationId: (ctx.agentState?.conversationId as string) || undefined,
    };

    const request = await store.create(input);

    return {
      status: 'success',
      request_id: request.id,
      message:
        'Your request has been submitted. Someone from our team will follow up shortly.',
    };
  },
};
