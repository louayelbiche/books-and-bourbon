import { describe, it, expect } from 'vitest';
import { formatTime, formatPriceVoice, formatPriceChat, dayName } from '../../src/voice-prompt/formatters/shared';
import { formatServiceVoice, formatHoursVoice, formatBookingVoice } from '../../src/voice-prompt/formatters/voice';

describe('formatTime', () => {
  it('"09:00" becomes "9 AM"', () => expect(formatTime('09:00')).toBe('9 AM'));
  it('"13:30" becomes "1:30 PM"', () => expect(formatTime('13:30')).toBe('1:30 PM'));
  it('"00:00" becomes "12 AM"', () => expect(formatTime('00:00')).toBe('12 AM'));
  it('"12:00" becomes "12 PM"', () => expect(formatTime('12:00')).toBe('12 PM'));
  it('"17:45" becomes "5:45 PM"', () => expect(formatTime('17:45')).toBe('5:45 PM'));
});

describe('formatPriceVoice', () => {
  it('0 returns empty', () => expect(formatPriceVoice(0)).toBe(''));
  it('100 returns "1 dollar"', () => expect(formatPriceVoice(100)).toBe('1 dollar'));
  it('2500 returns "25 dollars"', () => expect(formatPriceVoice(2500)).toBe('25 dollars'));
  it('2550 returns "25 dollars and 50 cents"', () => expect(formatPriceVoice(2550)).toBe('25 dollars and 50 cents'));
  it('101 returns "1 dollar and 1 cent"', () => expect(formatPriceVoice(101)).toBe('1 dollar and 1 cent'));
  it('negative returns empty', () => expect(formatPriceVoice(-500)).toBe(''));
});

describe('formatPriceChat', () => {
  it('0 returns empty', () => expect(formatPriceChat(0)).toBe(''));
  it('2500 returns "$25.00"', () => expect(formatPriceChat(2500)).toBe('$25.00'));
  it('2550 returns "$25.50"', () => expect(formatPriceChat(2550)).toBe('$25.50'));
});

describe('dayName', () => {
  it('0 is Sunday', () => expect(dayName(0)).toBe('Sunday'));
  it('6 is Saturday', () => expect(dayName(6)).toBe('Saturday'));
});

describe('formatServiceVoice', () => {
  it('includes name, price, duration', () => {
    const result = formatServiceVoice({
      id: '1', name: 'Haircut', description: '', priceInCents: 2500, durationMinutes: 30,
    });
    expect(result).toBe('Haircut, 25 dollars, 30 minutes');
  });

  it('omits price when 0', () => {
    const result = formatServiceVoice({
      id: '1', name: 'Consultation', description: '', priceInCents: 0, durationMinutes: 15,
    });
    expect(result).toBe('Consultation, 15 minutes');
  });

  it('omits duration when 0', () => {
    const result = formatServiceVoice({
      id: '1', name: 'Consultation', description: '', priceInCents: 5000, durationMinutes: 0,
    });
    expect(result).toBe('Consultation, 50 dollars');
  });
});

describe('formatHoursVoice', () => {
  it('formats open and closed days', () => {
    const result = formatHoursVoice([
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isActive: false },
    ]);
    expect(result).toContain('Sunday: Closed');
    expect(result).toContain('Monday: 9 AM to 5 PM');
  });

  it('sorts by day of week', () => {
    const result = formatHoursVoice([
      { dayOfWeek: 5, startTime: '10:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true },
    ]);
    expect(result.indexOf('Monday')).toBeLessThan(result.indexOf('Friday'));
  });
});

describe('formatBookingVoice', () => {
  it('includes all rules', () => {
    const result = formatBookingVoice({
      timezone: 'America/New_York',
      autoConfirm: true,
      requirePhone: true,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 30,
    });
    expect(result).toContain('America/New_York');
    expect(result).toContain('automatically confirmed');
    expect(result).toContain('60 minutes');
    expect(result).toContain('30 days');
    expect(result).toContain('Phone number required');
  });
});
