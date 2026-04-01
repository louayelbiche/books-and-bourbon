/**
 * Shared formatters used by both voice and chat channels.
 * Extracted from apps/web/lib/voice-prompt-builder.ts.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Convert 24-hour "HH:MM" to "9 AM" or "1:30 PM". */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${ampm}` : `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Convert cents to voice-friendly text: 2500 -> "25 dollars", 2550 -> "25 dollars and 50 cents". */
export function formatPriceVoice(cents: number): string {
  if (cents <= 0) return '';
  const dollars = Math.floor(cents / 100);
  const remainder = cents % 100;
  if (remainder === 0) {
    return dollars === 1 ? '1 dollar' : `${dollars} dollars`;
  }
  const dollarPart = dollars === 1 ? '1 dollar' : `${dollars} dollars`;
  const centPart = remainder === 1 ? '1 cent' : `${remainder} cents`;
  return `${dollarPart} and ${centPart}`;
}

/** Convert cents to chat-friendly text: 2500 -> "$25.00". */
export function formatPriceChat(cents: number): string {
  if (cents <= 0) return '';
  return `$${(cents / 100).toFixed(2)}`;
}

/** Get day name from dayOfWeek (0=Sunday). */
export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || 'Unknown';
}
