/**
 * Booking Core Tools
 *
 * Registers check_availability and create_booking as core tools
 * available to all BIB agents. Uses @runwell/booking-adapter.
 */

import type { BibTool, BibToolContext } from '../types.js';

export const checkAvailabilityTool: BibTool = {
  name: 'check_availability',
  description:
    'Check available booking slots for a date. Use for appointments, table reservations, car rentals, hotel rooms, or any bookable resource.',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
      date_end: {
        type: 'string',
        description: 'End date for multi-day bookings (optional)',
      },
      time_preference: {
        type: 'string',
        description: '"morning", "afternoon", "evening", or "HH:mm" (optional)',
      },
      resource_type: {
        type: 'string',
        description: '"table", "car", "room", "appointment" (optional)',
      },
      party_size: {
        type: 'number',
        description: 'Number of people (optional)',
      },
    },
    required: ['date'],
  },
  tier: 'core',

  async execute(
    args: Record<string, unknown>,
    ctx: BibToolContext
  ): Promise<unknown> {
    const adapter = (ctx.agentState as any)?.bookingAdapter;
    if (!adapter) {
      return {
        available: false,
        message: 'No booking system is connected for this business.',
      };
    }

    const slots = await adapter.getAvailableSlots({
      date: args.date as string,
      dateEnd: (args.date_end as string) || undefined,
      timePreference: (args.time_preference as string) || undefined,
      resourceType: (args.resource_type as string) || undefined,
      capacity: args.party_size ? Number(args.party_size) : undefined,
    });

    if (slots.length === 0) {
      return {
        available: false,
        message: 'No availability found for the requested date and criteria.',
        slots: [],
      };
    }

    return {
      available: true,
      count: slots.length,
      slots: slots.map((s: any) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        resource: s.resource,
        capacity: s.capacity,
      })),
    };
  },
};

export const createBookingTool: BibTool = {
  name: 'create_booking',
  description:
    'Book a confirmed slot. Requires visitor name and slot ID from check_availability.',
  parameters: {
    type: 'object',
    properties: {
      slot_id: { type: 'string', description: 'Slot ID to book' },
      visitor_name: { type: 'string', description: 'Name of person booking' },
      visitor_email: { type: 'string', description: 'Email (optional)' },
      visitor_phone: { type: 'string', description: 'Phone (optional)' },
      notes: { type: 'string', description: 'Special requests (optional)' },
      party_size: { type: 'number', description: 'Number of people (optional)' },
    },
    required: ['slot_id', 'visitor_name'],
  },
  tier: 'core',

  async execute(
    args: Record<string, unknown>,
    ctx: BibToolContext
  ): Promise<unknown> {
    const adapter = (ctx.agentState as any)?.bookingAdapter;
    if (!adapter) {
      return {
        success: false,
        message: 'No booking system is connected for this business.',
      };
    }

    if (!adapter.canWrite) {
      return {
        success: false,
        message:
          'I can check availability but cannot complete bookings directly. Someone from the team will confirm your booking shortly.',
        requiresEscalation: true,
      };
    }

    return adapter.createBooking({
      slotId: args.slot_id as string,
      visitorName: args.visitor_name as string,
      visitorEmail: (args.visitor_email as string) || undefined,
      visitorPhone: (args.visitor_phone as string) || undefined,
      notes: (args.notes as string) || undefined,
      partySize: args.party_size ? Number(args.party_size) : undefined,
    });
  },
};

export const bookingTools: BibTool[] = [
  checkAvailabilityTool,
  createBookingTool,
];
