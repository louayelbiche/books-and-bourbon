/**
 * Shared test fixtures for voice prompt tests.
 */
import type { BlockDataInput, TenantMeta } from '../../src/voice-prompt/types';

// ---------------------------------------------------------------------------
// Base empty input (all fields present but empty)
// ---------------------------------------------------------------------------

export function emptyInput(overrides?: Partial<BlockDataInput>): BlockDataInput {
  return {
    tenantId: 'test-tenant-id',
    tenantName: 'Test Business',
    meta: {},
    services: [],
    products: [],
    menuItems: [],
    faqs: [],
    hours: [],
    bookingConfig: null,
    caller: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Salon tenant (services + booking + hours + FAQs)
// ---------------------------------------------------------------------------

export function salonInput(): BlockDataInput {
  return emptyInput({
    tenantName: 'Bella Salon',
    meta: {
      category: 'salon',
      description: 'A premium hair salon in downtown.',
      contact: { phone: '+1-555-0100', email: 'info@bellasalon.com', website: 'https://bellasalon.com' },
      address: { city: 'New York', state: 'NY', country: 'USA' },
      leadQualQuestions: 'What service are you interested in? When would you like to come in?',
    },
    services: [
      { id: 'svc-1', name: 'Haircut', description: 'Standard haircut', priceInCents: 2500, durationMinutes: 30 },
      { id: 'svc-2', name: 'Color', description: 'Full color treatment', priceInCents: 8000, durationMinutes: 60 },
      { id: 'svc-3', name: 'Blowout', description: 'Professional blowout', priceInCents: 3500, durationMinutes: 45 },
    ],
    hours: [
      { dayOfWeek: 0, startTime: '00:00', endTime: '00:00', isActive: false },
      { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true },
      { dayOfWeek: 6, startTime: '10:00', endTime: '16:00', isActive: true },
    ],
    faqs: [
      { id: 'faq-1', question: 'Do you take walk-ins?', answer: 'Yes, but appointments are recommended.', category: '' },
      { id: 'faq-2', question: 'What payment methods do you accept?', answer: 'Cash, credit cards, and Apple Pay.', category: '' },
    ],
    bookingConfig: {
      timezone: 'America/New_York',
      autoConfirm: true,
      requirePhone: false,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 14,
    },
  });
}

// ---------------------------------------------------------------------------
// Restaurant tenant (menu items + hours + FAQs, no services)
// ---------------------------------------------------------------------------

export function restaurantInput(): BlockDataInput {
  return emptyInput({
    tenantName: 'Mario\'s Pizzeria',
    meta: {
      category: 'restaurant',
      description: 'Authentic Italian pizza since 1985.',
      contact: { phone: '+1-555-0200', email: 'order@mariospizza.com' },
      address: { street: '42 Oak Street', city: 'Brooklyn', state: 'NY', country: 'USA' },
    },
    menuItems: [
      { id: 'mi-1', name: 'Margherita Pizza', description: 'Classic tomato and mozzarella', priceInCents: 1200, categoryName: 'Pizzas', allergens: ['dairy', 'gluten'] },
      { id: 'mi-2', name: 'Pepperoni Pizza', description: 'Loaded with pepperoni', priceInCents: 1400, categoryName: 'Pizzas', allergens: ['dairy', 'gluten'] },
      { id: 'mi-3', name: 'Caesar Salad', description: 'Romaine, croutons, parmesan', priceInCents: 800, categoryName: 'Salads', allergens: ['dairy', 'gluten'] },
    ],
    hours: [
      { dayOfWeek: 0, startTime: '12:00', endTime: '21:00', isActive: true },
      { dayOfWeek: 1, startTime: '11:00', endTime: '22:00', isActive: true },
      { dayOfWeek: 2, startTime: '11:00', endTime: '22:00', isActive: true },
      { dayOfWeek: 3, startTime: '11:00', endTime: '22:00', isActive: true },
      { dayOfWeek: 4, startTime: '11:00', endTime: '22:00', isActive: true },
      { dayOfWeek: 5, startTime: '11:00', endTime: '23:00', isActive: true },
      { dayOfWeek: 6, startTime: '11:00', endTime: '23:00', isActive: true },
    ],
    faqs: [
      { id: 'faq-r1', question: 'Do you deliver?', answer: 'Yes, we deliver within a 3-mile radius.', category: '' },
    ],
  });
}

// ---------------------------------------------------------------------------
// SaaS self-bot (Receptia: custom instructions + FAQs + contact, no services/products)
// ---------------------------------------------------------------------------

export function saasInput(): BlockDataInput {
  return emptyInput({
    tenantId: '633a5813-9468-4dc2-96c8-88ed7ccb3ab9',
    tenantName: 'Receptia AI',
    meta: {
      category: 'AI Software',
      description: 'AI-powered receptionist for businesses.',
      customSystemPrompt: `You are Receptia, a professional AI receptionist assistant.

PRICING:
- Website chatbot: 100 dollars per month
- Each additional channel: +50 dollars per month
- No per-conversation fees, no per-contact fees, no hidden costs

GUARDRAILS:
- Never mention competitor products or companies by name
- Never share internal information about Runwell Systems`,
      contact: { phone: '+1-917-332-1704', email: 'hello@receptia.ai', website: 'https://receptia.ai' },
      address: { city: 'New York', state: 'NY', country: 'USA' },
      leadQualQuestions: 'What are you interested in? What is the best phone number to reach you?',
    },
    faqs: [
      { id: 'faq-s1', question: 'How much does Receptia cost?', answer: 'Receptia starts at 100 dollars per month for the website channel. Each additional channel is 50 dollars per month.', category: '' },
      { id: 'faq-s2', question: 'How long does setup take?', answer: 'Most businesses are up and running within 24 hours.', category: '' },
    ],
  });
}

// ---------------------------------------------------------------------------
// Dentist tenant (services + booking, no products/menu)
// ---------------------------------------------------------------------------

export function dentistInput(): BlockDataInput {
  return emptyInput({
    tenantName: 'Bright Smile Dental',
    meta: {
      category: 'healthcare',
      contact: { phone: '+1-555-0300', email: 'office@brightsmile.com' },
    },
    services: [
      { id: 'svc-d1', name: 'Teeth Cleaning', description: 'Standard cleaning', priceInCents: 15000, durationMinutes: 45 },
      { id: 'svc-d2', name: 'Whitening', description: 'Professional whitening', priceInCents: 30000, durationMinutes: 60 },
    ],
    hours: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 2, startTime: '08:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 3, startTime: '08:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 4, startTime: '08:00', endTime: '17:00', isActive: true },
      { dayOfWeek: 5, startTime: '08:00', endTime: '14:00', isActive: true },
    ],
    bookingConfig: {
      timezone: 'America/New_York',
      autoConfirm: false,
      requirePhone: true,
      minAdvanceMinutes: 120,
      maxAdvanceDays: 60,
    },
  });
}
