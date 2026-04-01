/**
 * Business Hours Tool
 *
 * Returns business operating hours with timezone awareness.
 */

import type { AgentTool } from '@runwell/agent-core';
import type { PidgieContext, DayHours, WeeklyHours } from '../types/index.js';

const DAYS_OF_WEEK = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const businessHoursTool: AgentTool = {
  name: 'get_business_hours',
  description: 'Get the business operating hours. Can check if currently open, get hours for a specific day, or get the full weekly schedule.',
  parameters: {
    type: 'object',
    properties: {
      day: {
        type: 'string',
        description: 'Specific day to check (monday, tuesday, etc.). If not provided, returns full weekly schedule.',
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
      check_open_now: {
        type: 'boolean',
        description: 'Whether to check if the business is currently open',
      },
    },
    required: [],
  },
  execute: async (args, context) => {
    const ctx = context as unknown as PidgieContext;
    const { business, timestamp } = ctx;
    const { hours } = business;

    const result: Record<string, unknown> = {
      timezone: hours.timezone,
    };

    // Check if currently open
    if (args.check_open_now) {
      const openStatus = checkIfOpen(hours.regular, timestamp, hours.timezone);
      result.isOpen = openStatus.isOpen;
      result.currentStatus = openStatus.message;
      if (openStatus.nextChange) {
        result.nextChange = openStatus.nextChange;
      }
    }

    // Get specific day or full schedule
    if (args.day) {
      const day = args.day as keyof WeeklyHours;
      const dayHours = hours.regular[day];
      result.day = args.day;
      result.hours = formatDayHours(dayHours);
    } else {
      // Return full weekly schedule
      result.weeklySchedule = {};
      for (const day of DAYS_OF_WEEK) {
        (result.weeklySchedule as Record<string, string>)[day] = formatDayHours(
          hours.regular[day as keyof WeeklyHours]
        );
      }
    }

    // Include special hours if any upcoming
    if (hours.special && hours.special.length > 0) {
      const upcoming = hours.special.filter((s) => {
        const specialDate = new Date(s.date);
        const now = new Date(timestamp);
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        return specialDate >= now && specialDate <= weekFromNow;
      });

      if (upcoming.length > 0) {
        result.upcomingSpecialHours = upcoming.map((s) => ({
          date: s.date,
          name: s.name,
          hours: formatDayHours(s.hours),
        }));
      }
    }

    return result;
  },
};

/**
 * Format day hours for display
 */
function formatDayHours(hours: DayHours | null): string {
  if (!hours) {
    return 'Closed';
  }

  let result = `${formatTime(hours.open)} - ${formatTime(hours.close)}`;

  if (hours.breaks && hours.breaks.length > 0) {
    const breaks = hours.breaks
      .map((b) => `${formatTime(b.start)} - ${formatTime(b.end)}`)
      .join(', ');
    result += ` (closed ${breaks})`;
  }

  return result;
}

/**
 * Format 24h time to 12h format
 */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if business is currently open
 */
function checkIfOpen(
  weekly: WeeklyHours,
  timestamp: Date,
  _timezone: string
): { isOpen: boolean; message: string; nextChange?: string } {
  // Note: In production, use proper timezone library like date-fns-tz
  const now = timestamp;
  const dayIndex = now.getDay();
  const day = DAYS_OF_WEEK[dayIndex];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const todayHours = weekly[day as keyof WeeklyHours];

  if (!todayHours) {
    // Find next open day
    const nextOpenDay = findNextOpenDay(weekly, dayIndex);
    return {
      isOpen: false,
      message: `Closed today. Opens ${nextOpenDay.day} at ${formatTime(nextOpenDay.openTime)}`,
      nextChange: `${nextOpenDay.day} ${formatTime(nextOpenDay.openTime)}`,
    };
  }

  // Check if within business hours
  if (currentTime < todayHours.open) {
    return {
      isOpen: false,
      message: `Not yet open. Opens at ${formatTime(todayHours.open)}`,
      nextChange: formatTime(todayHours.open),
    };
  }

  if (currentTime >= todayHours.close) {
    const nextOpenDay = findNextOpenDay(weekly, dayIndex);
    return {
      isOpen: false,
      message: `Closed for today. Opens ${nextOpenDay.day} at ${formatTime(nextOpenDay.openTime)}`,
      nextChange: `${nextOpenDay.day} ${formatTime(nextOpenDay.openTime)}`,
    };
  }

  // Check for breaks
  if (todayHours.breaks) {
    for (const brk of todayHours.breaks) {
      if (currentTime >= brk.start && currentTime < brk.end) {
        return {
          isOpen: false,
          message: `On break. Reopens at ${formatTime(brk.end)}`,
          nextChange: formatTime(brk.end),
        };
      }
    }
  }

  return {
    isOpen: true,
    message: `Open until ${formatTime(todayHours.close)}`,
    nextChange: formatTime(todayHours.close),
  };
}

/**
 * Find the next day the business is open
 */
function findNextOpenDay(
  weekly: WeeklyHours,
  currentDayIndex: number
): { day: string; openTime: string } {
  for (let i = 1; i <= 7; i++) {
    const checkIndex = (currentDayIndex + i) % 7;
    const day = DAYS_OF_WEEK[checkIndex];
    const hours = weekly[day as keyof WeeklyHours];

    if (hours) {
      const dayName = i === 1 ? 'tomorrow' : day.charAt(0).toUpperCase() + day.slice(1);
      return { day: dayName, openTime: hours.open };
    }
  }

  // Fallback (shouldn't happen if business has any open hours)
  return { day: 'unknown', openTime: '00:00' };
}
