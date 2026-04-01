import { describe, it, expect } from 'vitest';
import { PromptAssembler } from '../../src/voice-prompt/assembler';
import { FactGuard } from '../../src/voice-prompt/fact-guard';
import { createDefaultRegistry } from '../../src/voice-prompt/defaults';
import { salonInput, restaurantInput, saasInput, dentistInput } from './test-fixtures';

describe('Integration: full pipeline', () => {
  const registry = createDefaultRegistry();

  // -------------------------------------------------------------------------
  // 1. Salon tenant
  // -------------------------------------------------------------------------

  it('salon: services + booking + hours + FAQs all present, FactGuard passes', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());

    expect(result.includedBlocks).toContain('identity');
    expect(result.includedBlocks).toContain('hours');
    expect(result.includedBlocks).toContain('services');
    expect(result.includedBlocks).toContain('faqs');
    expect(result.includedBlocks).toContain('contact');
    expect(result.includedBlocks).toContain('booking');
    expect(result.includedBlocks).toContain('lead-qualification');
    expect(result.includedBlocks).toContain('call-rules');

    // No products or menu for a salon
    expect(result.skippedBlocks.map((s) => s.name)).toContain('products');
    expect(result.skippedBlocks.map((s) => s.name)).toContain('menu');

    // FactGuard passes (all data from DB)
    expect(result.verification.passed).toBe(true);
    expect(result.verification.violations).toEqual([]);

    // Content sanity
    expect(result.text).toContain('Bella Salon');
    expect(result.text).toContain('Haircut, 25 dollars, 30 minutes');
    expect(result.text).toContain('Sunday: Closed');
    expect(result.text).toContain('+1-555-0100');
  });

  // -------------------------------------------------------------------------
  // 2. Restaurant tenant
  // -------------------------------------------------------------------------

  it('restaurant: menu block instead of services, FactGuard passes', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(restaurantInput());

    expect(result.includedBlocks).toContain('menu');
    expect(result.includedBlocks).not.toContain('services');

    expect(result.text).toContain('Margherita Pizza, 12 dollars');
    expect(result.text).toContain('Pizzas:');
    expect(result.text).toContain('Salads:');
    expect(result.text).toContain('Mario\'s Pizzeria');

    expect(result.verification.passed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. SaaS self-bot (Receptia)
  // -------------------------------------------------------------------------

  it('SaaS: custom-instructions + FAQs + contact, no services/products', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(saasInput());

    expect(result.includedBlocks).toContain('identity');
    expect(result.includedBlocks).toContain('custom-instructions');
    expect(result.includedBlocks).toContain('faqs');
    expect(result.includedBlocks).toContain('contact');
    expect(result.includedBlocks).toContain('lead-qualification');
    expect(result.includedBlocks).toContain('call-rules');

    expect(result.includedBlocks).not.toContain('services');
    expect(result.includedBlocks).not.toContain('products');
    expect(result.includedBlocks).not.toContain('menu');
    expect(result.includedBlocks).not.toContain('booking');

    // Custom instructions verbatim
    expect(result.text).toContain('Never mention competitor products');
    expect(result.text).toContain('100 dollars per month');
    expect(result.text).toContain('hello@receptia.ai');

    expect(result.verification.passed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 4. Dentist
  // -------------------------------------------------------------------------

  it('dentist: services + booking, no products/menu', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(dentistInput());

    expect(result.includedBlocks).toContain('services');
    expect(result.includedBlocks).toContain('booking');
    expect(result.includedBlocks).not.toContain('menu');
    expect(result.includedBlocks).not.toContain('products');

    expect(result.text).toContain('Teeth Cleaning, 150 dollars, 45 minutes');
    expect(result.text).toContain('Whitening, 300 dollars, 60 minutes');
    expect(result.text).toContain('Phone number required');

    expect(result.verification.passed).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 5. Fabrication injection test
  // -------------------------------------------------------------------------

  it('FactGuard catches fabricated price injected into prompt', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());

    // Manually inject a fabricated line into the text and re-verify
    const guard = new FactGuard(salonInput());
    const fabricated = result.text + '\nWe also offer a special package for 999 dollars.';
    const audit = [...result.audit, {
      lineNumber: result.audit.length + 2,
      text: 'We also offer a special package for 999 dollars.',
      sources: [],
      blockName: 'test-injection',
    }];
    const verification = guard.verify(fabricated, audit);

    expect(verification.passed).toBe(false);
    expect(verification.violations.some((v: any) => v.type === 'price_mismatch')).toBe(true);
    expect(verification.violations.some((v: any) => v.found.includes('999'))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 6. Chat channel excludes call rules
  // -------------------------------------------------------------------------

  it('chat channel produces prompt without voice call rules', () => {
    const assembler = new PromptAssembler(registry, 'chat');
    const result = assembler.assemble(salonInput());

    expect(result.includedBlocks).not.toContain('call-rules');
    expect(result.text).not.toContain('VOICE CALL RULES:');
    // But still has all business data
    expect(result.text).toContain('Bella Salon');
    expect(result.text).toContain('Haircut');
  });
});
