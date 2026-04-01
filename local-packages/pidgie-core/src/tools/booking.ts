/**
 * Booking Integration Tools
 *
 * Tools for checking availability and booking information.
 * SECURITY: Only exposes public booking info - no internal reservation systems.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext, AvailabilitySlot, BookingResource, BusinessHours, WeeklyHours, DayHours } from '../types/index.js';

/**
 * Check availability tool
 */
export const checkAvailabilityTool: AgentTool = {
  name: 'check_availability',
  description: 'Check availability for appointments, reservations, or bookings on specific dates.',
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: 'Date to check (YYYY-MM-DD format). Defaults to today.',
      },
      date_range_end: {
        type: 'string',
        description: 'End date for range check (YYYY-MM-DD format). Optional.',
      },
      party_size: {
        type: 'number',
        description: 'Number of people/guests (for restaurants/hotels)',
      },
      resource_type: {
        type: 'string',
        description: 'Type of resource to check (e.g., "table", "room", "staff")',
      },
      resource_id: {
        type: 'string',
        description: 'Specific resource ID to check',
      },
      time_preference: {
        type: 'string',
        description: 'Preferred time (morning, afternoon, evening) or specific time (HH:MM)',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business, timestamp } = ctx;

    if (!business.booking || !business.booking.enabled) {
      return {
        available: false,
        message: 'Online booking is not currently available. Please contact us directly.',
        contact: business.contact,
      };
    }

    const booking = business.booking;

    // Parse date (default to today)
    const dateStr = (args.date as string) || formatDateStr(timestamp);
    const requestDate = parseDate(dateStr);

    if (!requestDate) {
      return {
        available: false,
        error: 'Invalid date format. Please use YYYY-MM-DD.',
      };
    }

    // Check advance booking limits
    const now = new Date(timestamp);
    const hoursUntilBooking = (requestDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (booking.minAdvance && hoursUntilBooking < booking.minAdvance) {
      return {
        available: false,
        message: `Bookings must be made at least ${booking.minAdvance} hours in advance.`,
        suggestion: `The earliest available date is ${formatDateStr(new Date(now.getTime() + booking.minAdvance * 60 * 60 * 1000))}.`,
      };
    }

    if (booking.maxAdvance) {
      const maxDate = new Date(now.getTime() + booking.maxAdvance * 24 * 60 * 60 * 1000);
      if (requestDate > maxDate) {
        return {
          available: false,
          message: `Bookings can only be made up to ${booking.maxAdvance} days in advance.`,
          suggestion: `Please choose a date before ${formatDateStr(maxDate)}.`,
        };
      }
    }

    // Get available slots
    // NOTE: In production, this would query a real booking system
    const slots = generateAvailabilitySlots(
      requestDate,
      business.hours,
      booking,
      args.party_size as number | undefined,
      args.resource_type as string | undefined,
      args.resource_id as string | undefined,
      args.time_preference as string | undefined
    );

    // Filter by date range if provided
    let filteredSlots = slots;
    if (args.date_range_end) {
      const endDate = parseDate(args.date_range_end as string);
      if (endDate) {
        filteredSlots = slots.filter((slot) => {
          const slotDate = new Date(slot.startTime);
          return slotDate <= endDate;
        });
      }
    }

    if (filteredSlots.length === 0) {
      return {
        available: false,
        date: dateStr,
        message: 'No availability found for the requested date/time.',
        suggestion: 'Try a different date or contact us for assistance.',
        policies: booking.policies,
      };
    }

    // Format slots for response
    const formattedSlots = filteredSlots.map(formatSlotForPublic);

    return {
      available: true,
      date: dateStr,
      bookingType: booking.type,
      slots: formattedSlots,
      totalSlots: formattedSlots.length,
      policies: booking.policies ? {
        cancellation: booking.policies.cancellation,
        depositRequired: booking.policies.depositRequired,
      } : undefined,
    };
  },
};

/**
 * Get booking info tool
 */
export const getBookingInfoTool: AgentTool = {
  name: 'get_booking_info',
  description: 'Get information about booking policies, available resources, and requirements.',
  parameters: {
    type: 'object',
    properties: {
      include_resources: {
        type: 'boolean',
        description: 'Include list of bookable resources (tables, rooms, etc.)',
      },
      include_policies: {
        type: 'boolean',
        description: 'Include booking policies',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business } = ctx;

    if (!business.booking || !business.booking.enabled) {
      return {
        bookingEnabled: false,
        message: 'Online booking is not currently available.',
        contact: {
          phone: business.contact.phone,
          email: business.contact.email,
        },
      };
    }

    const booking = business.booking;

    const info: Record<string, unknown> = {
      bookingEnabled: true,
      type: booking.type,
      typeDescription: getBookingTypeDescription(booking.type),
    };

    // Advance booking requirements
    if (booking.minAdvance) {
      info.minimumAdvance = `${booking.minAdvance} hours`;
    }
    if (booking.maxAdvance) {
      info.maximumAdvance = `${booking.maxAdvance} days`;
    }

    // Include resources if requested
    const includeResources = args.include_resources !== false;
    if (includeResources && booking.resources && booking.resources.length > 0) {
      info.resources = booking.resources.map(formatResourceForPublic);
    }

    // Include policies if requested
    const includePolicies = args.include_policies !== false;
    if (includePolicies && booking.policies) {
      info.policies = {
        cancellation: booking.policies.cancellation,
        depositRequired: booking.policies.depositRequired,
        depositAmount: booking.policies.depositAmount
          ? `${booking.policies.depositAmount}${booking.policies.depositRequired ? '' : ' (if applicable)'}`
          : undefined,
        paymentTerms: booking.policies.paymentTerms,
        additionalRules: booking.policies.additionalRules,
      };
    }

    return info;
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date from YYYY-MM-DD string
 */
function parseDate(dateStr: string): Date | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;

  return date;
}

/**
 * Get booking type description
 */
function getBookingTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    appointment: 'Schedule an appointment with our team',
    reservation: 'Make a table or dining reservation',
    room: 'Book a room or accommodation',
    event: 'Reserve space for an event or gathering',
  };
  return descriptions[type] || 'Make a booking';
}

/**
 * Generate availability slots
 * NOTE: In production, this would query a real booking system
 */
function generateAvailabilitySlots(
  date: Date,
  hours: BusinessHours,
  booking: { type: string; resources?: BookingResource[] },
  _partySize?: number,
  resourceType?: string,
  resourceId?: string,
  timePreference?: string
): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];

  // Get day of week
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const dayName = days[date.getDay()] as keyof WeeklyHours;
  const dayHours: DayHours | null = hours.regular[dayName];

  if (!dayHours) {
    return []; // Closed on this day
  }

  // Parse open/close times
  const [openHour, openMin] = dayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = dayHours.close.split(':').map(Number);

  // Generate hourly slots (simplified)
  for (let hour = openHour; hour < closeHour; hour++) {
    // Filter by time preference
    if (timePreference) {
      if (timePreference === 'morning' && hour >= 12) continue;
      if (timePreference === 'afternoon' && (hour < 12 || hour >= 17)) continue;
      if (timePreference === 'evening' && hour < 17) continue;

      // Specific time
      if (timePreference.match(/^\d{2}:\d{2}$/)) {
        const [prefHour] = timePreference.split(':').map(Number);
        if (hour !== prefHour) continue;
      }
    }

    const startTime = new Date(date);
    startTime.setHours(hour, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(hour + 1, 0, 0, 0);

    // Mock availability (in production, query real system)
    const available = Math.floor(Math.random() * 5) + 1;
    const total = 5;

    if (available > 0) {
      const slot: AvailabilitySlot = {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        available,
        total,
      };

      // Add resource if applicable
      if (booking.resources && booking.resources.length > 0) {
        const resource = resourceId
          ? booking.resources.find((r) => r.id === resourceId)
          : resourceType
          ? booking.resources.find((r) => r.type === resourceType)
          : booking.resources[0];

        if (resource) {
          slot.resourceId = resource.id;
          if (resource.price) {
            slot.price = resource.price;
          }
        }
      }

      slots.push(slot);
    }
  }

  return slots;
}

/**
 * Format availability slot for public display
 */
function formatSlotForPublic(slot: AvailabilitySlot): Record<string, unknown> {
  const startTime = new Date(slot.startTime);

  return {
    time: formatTimeForDisplay(startTime),
    startTime: slot.startTime,
    endTime: slot.endTime,
    spotsAvailable: slot.available,
    price: slot.price
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: slot.price.currency,
        }).format(slot.price.amount)
      : undefined,
  };
}

/**
 * Format resource for public display
 */
function formatResourceForPublic(resource: BookingResource): Record<string, unknown> {
  const formatted: Record<string, unknown> = {
    id: resource.id,
    name: resource.name,
    type: resource.type,
  };

  if (resource.description) {
    formatted.description = resource.description;
  }

  if (resource.capacity) {
    formatted.capacity = resource.capacity;
  }

  if (resource.price) {
    formatted.price = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: resource.price.currency,
    }).format(resource.price.amount);

    if (resource.price.unit) {
      formatted.priceUnit = resource.price.unit;
    }
  }

  return formatted;
}

/**
 * Format time for display
 */
function formatTimeForDisplay(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
