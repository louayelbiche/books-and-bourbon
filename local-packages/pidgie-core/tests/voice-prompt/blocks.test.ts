import { describe, it, expect } from 'vitest';
import { identityBlock } from '../../src/voice-prompt/blocks/identity';
import { customInstructionsBlock } from '../../src/voice-prompt/blocks/custom-instructions';
import { hoursBlock } from '../../src/voice-prompt/blocks/hours';
import { servicesBlock } from '../../src/voice-prompt/blocks/services';
import { productsBlock } from '../../src/voice-prompt/blocks/products';
import { menuBlock } from '../../src/voice-prompt/blocks/menu';
import { faqsBlock } from '../../src/voice-prompt/blocks/faqs';
import { contactBlock } from '../../src/voice-prompt/blocks/contact';
import { bookingBlock } from '../../src/voice-prompt/blocks/booking';
import { leadQualificationBlock } from '../../src/voice-prompt/blocks/lead-qualification';
import { callerBlock } from '../../src/voice-prompt/blocks/caller';
import { callRulesBlock } from '../../src/voice-prompt/blocks/call-rules';
import { emptyInput, salonInput, restaurantInput, saasInput } from './test-fixtures';

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

describe('identity block', () => {
  it('always included', () => {
    expect(identityBlock.condition(emptyInput())).toBe(true);
  });

  it('formats business name', () => {
    const out = identityBlock.formatVoice(salonInput());
    expect(out.text).toContain('Bella Salon');
    expect(out.sources.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Custom instructions
// ---------------------------------------------------------------------------

describe('custom-instructions block', () => {
  it('excluded when no customSystemPrompt', () => {
    expect(customInstructionsBlock.condition(emptyInput())).toBe(false);
  });

  it('included when customSystemPrompt exists', () => {
    expect(customInstructionsBlock.condition(saasInput())).toBe(true);
  });

  it('outputs verbatim text', () => {
    const out = customInstructionsBlock.formatVoice(saasInput());
    expect(out.text).toContain('Never mention competitor');
    expect(out.text).toContain('100 dollars per month');
  });
});

// ---------------------------------------------------------------------------
// Hours
// ---------------------------------------------------------------------------

describe('hours block', () => {
  it('excluded when no hours', () => {
    expect(hoursBlock.condition(emptyInput())).toBe(false);
  });

  it('included when hours exist', () => {
    expect(hoursBlock.condition(salonInput())).toBe(true);
  });

  it('formats hours correctly', () => {
    const out = hoursBlock.formatVoice(salonInput());
    expect(out.text).toContain('BUSINESS HOURS:');
    expect(out.text).toContain('Sunday: Closed');
    expect(out.text).toContain('Monday: 9 AM to 6 PM');
  });
});

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

describe('services block', () => {
  it('excluded when no services', () => {
    expect(servicesBlock.condition(emptyInput())).toBe(false);
  });

  it('included when services exist', () => {
    expect(servicesBlock.condition(salonInput())).toBe(true);
  });

  it('formats services with price and duration', () => {
    const out = servicesBlock.formatVoice(salonInput());
    expect(out.text).toContain('SERVICES:');
    expect(out.text).toContain('Haircut, 25 dollars, 30 minutes');
    expect(out.text).toContain('Color, 80 dollars, 60 minutes');
  });
});

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

describe('products block', () => {
  it('excluded when no products', () => {
    expect(productsBlock.condition(emptyInput())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

describe('menu block', () => {
  it('excluded when no menu items', () => {
    expect(menuBlock.condition(emptyInput())).toBe(false);
  });

  it('included for restaurant', () => {
    expect(menuBlock.condition(restaurantInput())).toBe(true);
  });

  it('groups by category', () => {
    const out = menuBlock.formatVoice(restaurantInput());
    expect(out.text).toContain('MENU:');
    expect(out.text).toContain('Pizzas:');
    expect(out.text).toContain('Salads:');
    expect(out.text).toContain('Margherita Pizza, 12 dollars');
  });
});

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

describe('faqs block', () => {
  it('excluded when no FAQs', () => {
    expect(faqsBlock.condition(emptyInput())).toBe(false);
  });

  it('included when FAQs exist', () => {
    expect(faqsBlock.condition(salonInput())).toBe(true);
  });

  it('formats Q&A verbatim', () => {
    const out = faqsBlock.formatVoice(salonInput());
    expect(out.text).toContain('Q: Do you take walk-ins? A: Yes, but appointments are recommended.');
  });
});

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

describe('contact block', () => {
  it('excluded when no contact info', () => {
    expect(contactBlock.condition(emptyInput())).toBe(false);
  });

  it('included when contact exists', () => {
    expect(contactBlock.condition(salonInput())).toBe(true);
  });

  it('formats phone, email, website', () => {
    const out = contactBlock.formatVoice(salonInput());
    expect(out.text).toContain('Phone: +1-555-0100');
    expect(out.text).toContain('Email: info@bellasalon.com');
    expect(out.text).toContain('Website: https://bellasalon.com');
  });
});

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

describe('booking block', () => {
  it('excluded when no booking config', () => {
    expect(bookingBlock.condition(emptyInput())).toBe(false);
  });

  it('included when booking config exists', () => {
    expect(bookingBlock.condition(salonInput())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Lead qualification
// ---------------------------------------------------------------------------

describe('lead-qualification block', () => {
  it('excluded when no lead questions', () => {
    expect(leadQualificationBlock.condition(emptyInput())).toBe(false);
  });

  it('included when lead questions exist', () => {
    expect(leadQualificationBlock.condition(salonInput())).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Caller
// ---------------------------------------------------------------------------

describe('caller block', () => {
  it('excluded when no caller context', () => {
    expect(callerBlock.condition(emptyInput())).toBe(false);
  });

  it('included when caller phone provided', () => {
    expect(callerBlock.condition(emptyInput({ caller: { phone: '+1-555-9999', status: 'new' } }))).toBe(true);
  });

  it('formats returning caller with name', () => {
    const out = callerBlock.formatVoice(emptyInput({ caller: { phone: '+1-555-9999', name: 'Sarah', status: 'returning' } }));
    expect(out.text).toContain('Sarah');
    expect(out.text).toContain('returning');
  });
});

// ---------------------------------------------------------------------------
// Call rules
// ---------------------------------------------------------------------------

describe('call-rules block', () => {
  it('formats static voice rules', () => {
    const out = callRulesBlock.formatVoice(emptyInput());
    expect(out.text).toContain('VOICE CALL RULES:');
    expect(out.text).toContain('2-3 sentences');
    expect(out.text).toContain('transfer tool');
  });

  it('chat formatter returns empty', () => {
    const out = callRulesBlock.formatChat(emptyInput());
    expect(out.text).toBe('');
  });

  it('has no DB sources', () => {
    expect(callRulesBlock.dbSources).toEqual([]);
  });
});
