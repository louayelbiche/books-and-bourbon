import { describe, it, expect } from 'vitest';
import { PromptAssembler } from '../../src/voice-prompt/assembler';
import { createDefaultRegistry } from '../../src/voice-prompt/defaults';
import { emptyInput, salonInput, restaurantInput, saasInput } from './test-fixtures';

describe('PromptAssembler', () => {
  const registry = createDefaultRegistry();

  it('includes identity block always', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput());
    expect(result.includedBlocks).toContain('identity');
  });

  it('includes call-rules for voice channel', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput());
    expect(result.includedBlocks).toContain('call-rules');
    expect(result.text).toContain('VOICE CALL RULES:');
  });

  it('excludes call-rules for chat channel', () => {
    const assembler = new PromptAssembler(registry, 'chat');
    const result = assembler.assemble(emptyInput());
    expect(result.includedBlocks).not.toContain('call-rules');
  });

  it('skips services block when no services', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput());
    expect(result.skippedBlocks.map((s) => s.name)).toContain('services');
  });

  it('includes services block when services exist', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());
    expect(result.includedBlocks).toContain('services');
    expect(result.text).toContain('Haircut');
  });

  it('skips menu block when no menu items', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());
    expect(result.skippedBlocks.map((s) => s.name)).toContain('menu');
  });

  it('includes menu block for restaurant', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(restaurantInput());
    expect(result.includedBlocks).toContain('menu');
    expect(result.text).toContain('Margherita Pizza');
  });

  it('block ordering matches registration order', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());
    const identityIdx = result.text.indexOf('professional AI receptionist');
    const hoursIdx = result.text.indexOf('BUSINESS HOURS:');
    const servicesIdx = result.text.indexOf('SERVICES:');
    const faqsIdx = result.text.indexOf('FREQUENTLY ASKED');
    const contactIdx = result.text.indexOf('CONTACT:');
    const rulesIdx = result.text.indexOf('VOICE CALL RULES:');

    expect(identityIdx).toBeLessThan(hoursIdx);
    expect(hoursIdx).toBeLessThan(servicesIdx);
    expect(servicesIdx).toBeLessThan(faqsIdx);
    expect(faqsIdx).toBeLessThan(contactIdx);
    expect(contactIdx).toBeLessThan(rulesIdx);
  });

  it('assembledPrompt.text is blocks joined by double-newline', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput());
    // identity + call-rules, separated by \n\n
    expect(result.text).toContain('\n\n');
  });

  it('FactGuard runs automatically', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());
    expect(result.verification).toBeDefined();
    expect(result.verification.passed).toBe(true);
  });

  it('skippedBlocks includes reason for each skip', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput());
    const skipped = result.skippedBlocks.find((s) => s.name === 'services');
    expect(skipped).toBeDefined();
    expect(skipped!.reason).toBeTruthy();
  });

  it('callerContext injects into caller block', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput(), { phone: '+1-555-9999', name: 'Sarah', status: 'returning' });
    expect(result.includedBlocks).toContain('caller');
    expect(result.text).toContain('Sarah');
  });

  it('handles missing metadata gracefully', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(emptyInput({ meta: {} }));
    expect(result.text).toBeTruthy();
    expect(result.verification.passed).toBe(true);
  });

  it('audit trail maps lines to correct blocks', () => {
    const assembler = new PromptAssembler(registry, 'voice');
    const result = assembler.assemble(salonInput());
    // Find an audit entry for the services block
    const serviceAudit = result.audit.find((a) => a.blockName === 'services');
    expect(serviceAudit).toBeDefined();
    expect(serviceAudit!.sources.some((s) => s.table === 'Service')).toBe(true);
  });
});
