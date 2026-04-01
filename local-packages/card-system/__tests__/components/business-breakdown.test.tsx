import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessBreakdownCard } from '../../src/components/BusinessBreakdownCard.js';

function makeData(overrides: Record<string, unknown> = {}) {
  return {
    businessName: 'Test Biz',
    category: 'Restaurant',
    ...overrides,
  };
}

describe('BusinessBreakdownCard', () => {
  test('renders business name and category', () => {
    render(<BusinessBreakdownCard data={makeData()} />);
    expect(screen.getByText('Test Biz')).toBeDefined();
    expect(screen.getByText('Restaurant')).toBeDefined();
  });

  test('shows empty state when no sections have data', () => {
    render(<BusinessBreakdownCard data={makeData()} />);
    expect(screen.getByText('Business data not yet captured')).toBeDefined();
  });

  test('shows services as chips', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          services: [
            { name: 'Dine-in', available: true },
            { name: 'Takeout', available: false },
          ],
        })}
      />,
    );
    expect(screen.getByText('Dine-in')).toBeDefined();
    expect(screen.getByText('Takeout')).toBeDefined();
    // Should not show empty state
    expect(screen.queryByText('Business data not yet captured')).toBeNull();
  });

  test('shows products with formatted prices', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          products: [
            { name: 'Latte', price: 4.5, currency: 'USD' },
          ],
        })}
      />,
    );
    expect(screen.getByText('Latte')).toBeDefined();
    expect(screen.getByText('$4.50')).toBeDefined();
  });

  test('truncates products at 5 and shows "+N more"', () => {
    const products = Array.from({ length: 7 }, (_, i) => ({
      name: `Item ${i + 1}`,
      price: 10,
      currency: 'USD',
    }));
    render(<BusinessBreakdownCard data={makeData({ products })} />);

    // First 5 visible
    expect(screen.getByText('Item 1')).toBeDefined();
    expect(screen.getByText('Item 5')).toBeDefined();
    // Items 6-7 not shown
    expect(screen.queryByText('Item 6')).toBeNull();
    // "+2 more" shown
    expect(screen.getByText('+2 more')).toBeDefined();
  });

  test('shows hours when present', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          hours: { today: '9:00 AM - 5:00 PM', timezone: 'EST' },
        })}
      />,
    );
    expect(screen.getByText('9:00 AM - 5:00 PM')).toBeDefined();
  });

  test('shows "Closed today" when hours.today is null', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          hours: { today: null, timezone: 'EST' },
        })}
      />,
    );
    expect(screen.getByText('Closed today')).toBeDefined();
  });

  test('shows contact information', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          contactEmail: 'hi@test.com',
          contactPhone: '+1-555-1234',
        })}
      />,
    );
    expect(screen.getByText('hi@test.com')).toBeDefined();
    expect(screen.getByText('+1-555-1234')).toBeDefined();
  });

  test('shows FAQ count with singular form', () => {
    render(
      <BusinessBreakdownCard data={makeData({ faqCount: 1 })} />,
    );
    expect(screen.getByText('1 FAQ available')).toBeDefined();
  });

  test('shows FAQ count with plural form', () => {
    render(
      <BusinessBreakdownCard data={makeData({ faqCount: 5 })} />,
    );
    expect(screen.getByText('5 FAQs available')).toBeDefined();
  });

  test('does not show FAQ section when faqCount is 0', () => {
    render(
      <BusinessBreakdownCard data={makeData({ faqCount: 0 })} />,
    );
    expect(screen.queryByText(/FAQ/)).toBeNull();
  });

  test('shows dash indicator for missing sections when not fully empty', () => {
    // Having services means sections show, but hours/contact show "—"
    render(
      <BusinessBreakdownCard
        data={makeData({
          services: [{ name: 'WiFi', available: true }],
        })}
      />,
    );
    // Section headers should be visible
    expect(screen.getByText('Services')).toBeDefined();
    expect(screen.getByText('Products')).toBeDefined();
    // Missing sections show em-dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  test('accepts i18n label overrides', () => {
    render(
      <BusinessBreakdownCard
        data={makeData({
          services: [{ name: 'WiFi', available: true }],
        })}
        labels={{ services: 'خدمات', products: 'منتجات' }}
      />,
    );
    expect(screen.getByText('خدمات')).toBeDefined();
    expect(screen.getByText('منتجات')).toBeDefined();
  });
});
