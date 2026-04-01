/**
 * Voice-specific formatters.
 * Produce short, conversational text with no markdown or formatting.
 */

import type { ServiceData, ProductData, MenuItemData, HoursData, BookingConfigData } from '../types';
import { formatTime, formatPriceVoice, dayName } from './shared';

/** Format a single service for voice: "Haircut, 25 dollars, 30 minutes". */
export function formatServiceVoice(s: ServiceData): string {
  const parts = [s.name];
  const price = formatPriceVoice(s.priceInCents);
  if (price) parts.push(price);
  if (s.durationMinutes > 0) parts.push(`${s.durationMinutes} minutes`);
  return parts.join(', ');
}

/** Format a single product for voice: "Widget, 15 dollars". */
export function formatProductVoice(p: ProductData): string {
  const parts = [p.name];
  const price = formatPriceVoice(p.priceInCents);
  if (price) parts.push(price);
  return parts.join(', ');
}

/** Format a single menu item for voice: "Margherita Pizza, 12 dollars". */
export function formatMenuItemVoice(m: MenuItemData): string {
  const parts = [m.name];
  const price = formatPriceVoice(m.priceInCents);
  if (price) parts.push(price);
  return parts.join(', ');
}

/** Format hours for voice: "Monday: 9 AM to 6 PM. Tuesday: 9 AM to 6 PM. ..." */
export function formatHoursVoice(hours: HoursData[]): string {
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  return sorted.map((h) => {
    if (!h.isActive) return `${dayName(h.dayOfWeek)}: Closed`;
    return `${dayName(h.dayOfWeek)}: ${formatTime(h.startTime)} to ${formatTime(h.endTime)}`;
  }).join('. ');
}

/** Format booking config for voice. */
export function formatBookingVoice(bc: BookingConfigData): string {
  const rules: string[] = [];
  rules.push(`Timezone: ${bc.timezone}`);
  if (bc.autoConfirm) rules.push('Appointments are automatically confirmed');
  if (bc.minAdvanceMinutes > 0) rules.push(`Book at least ${bc.minAdvanceMinutes} minutes in advance`);
  if (bc.maxAdvanceDays > 0) rules.push(`Book up to ${bc.maxAdvanceDays} days ahead`);
  if (bc.requirePhone) rules.push('Phone number required for booking');
  return rules.join('. ');
}
