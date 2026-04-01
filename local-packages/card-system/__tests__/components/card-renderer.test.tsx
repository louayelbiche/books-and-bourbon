import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardRenderer } from '../../src/components/CardRenderer.js';
import type { ChatCard, CardTheme, CardConfig } from '../../src/types.js';

const theme: CardTheme = {
  card: { bg: '#fff', border: '#e5e7eb', radius: '8px', shadow: 'none', hoverBorder: '#3b82f6' },
  cardImage: { bg: '#f3f4f6', fallbackBg: '#fef2f2', fallbackText: '#dc2626', aspectRatio: '16/9' },
  cardTitle: { color: '#111827', fontSize: '14px' },
  cardSubtitle: { color: '#6b7280', fontSize: '12px' },
  cardVariant: { bg: '#f3f4f6', border: '#e5e7eb', text: '#374151', activeBg: '#3b82f6', activeBorder: '#3b82f6' },
  cardStaleness: { color: '#9ca3af', fontSize: '11px' },
  action: { primaryBg: '#111827', primaryText: '#fff', secondaryBg: '#f3f4f6', secondaryText: '#374151', border: '#d1d5db', hoverBg: '#1f2937' },
};

const config: CardConfig = {
  maxCardsPerMessage: 3,
  expandSteps: [3, 6],
  stalenessThresholdMs: 86400000,
  clickBehavior: 'new_tab',
  enableVariantSelectors: false,
  enableAddToCart: false,
};

function makeCard(overrides: Partial<ChatCard> = {}): ChatCard {
  return {
    id: 'card-1',
    type: 'product',
    title: 'Test Product',
    url: 'https://example.com/product',
    generatedAt: Date.now(),
    ...overrides,
  };
}

describe('CardRenderer', () => {
  test('renders card title', () => {
    render(<CardRenderer card={makeCard()} theme={theme} config={config} onClick={() => {}} />);
    expect(screen.getByText('Test Product')).toBeDefined();
  });

  test('has role=button and keyboard accessibility', () => {
    const { container } = render(
      <CardRenderer card={makeCard()} theme={theme} config={config} onClick={() => {}} />,
    );
    const el = container.querySelector('[role="button"]');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('tabindex')).toBe('0');
  });

  test('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const card = makeCard();
    render(<CardRenderer card={card} theme={theme} config={config} onClick={onClick} />);
    fireEvent.click(screen.getByText('Test Product'));
    expect(onClick).toHaveBeenCalledWith(card);
  });

  test('calls onClick on Enter key', () => {
    const onClick = vi.fn();
    const { container } = render(
      <CardRenderer card={makeCard()} theme={theme} config={config} onClick={onClick} />,
    );
    const el = container.querySelector('[role="button"]')!;
    fireEvent.keyDown(el, { key: 'Enter' });
    expect(onClick).toHaveBeenCalled();
  });

  test('calls onClick on Space key', () => {
    const onClick = vi.fn();
    const { container } = render(
      <CardRenderer card={makeCard()} theme={theme} config={config} onClick={onClick} />,
    );
    const el = container.querySelector('[role="button"]')!;
    fireEvent.keyDown(el, { key: ' ' });
    expect(onClick).toHaveBeenCalled();
  });

  test('renders subtitle when present', () => {
    render(
      <CardRenderer
        card={makeCard({ subtitle: '$29.99' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('$29.99')).toBeDefined();
  });

  test('does not render subtitle row when subtitle is empty', () => {
    const { container } = render(
      <CardRenderer
        card={makeCard({ subtitle: '' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    // No subtitle paragraph element
    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(1); // Only title
  });

  test('renders thumbnail when image is present', () => {
    render(
      <CardRenderer
        card={makeCard({ image: 'https://example.com/img.jpg' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    const img = screen.getByAltText('Test Product') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/img.jpg');
  });

  test('does not render thumbnail when no image', () => {
    const { container } = render(
      <CardRenderer card={makeCard()} theme={theme} config={config} onClick={() => {}} />,
    );
    expect(container.querySelector('img')).toBeNull();
  });

  test('renders sold_out badge', () => {
    render(
      <CardRenderer
        card={makeCard({ availability: 'sold_out' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Sold out')).toBeDefined();
  });

  test('renders low_stock badge', () => {
    render(
      <CardRenderer
        card={makeCard({ availability: 'low_stock' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Low stock')).toBeDefined();
  });

  test('does not render availability badge when available', () => {
    const { container } = render(
      <CardRenderer
        card={makeCard({ availability: 'available' })}
        theme={theme}
        config={config}
        onClick={() => {}}
      />,
    );
    expect(container.textContent).not.toContain('Sold out');
    expect(container.textContent).not.toContain('Low stock');
  });

  test('renders variant badges when enabled', () => {
    const variantConfig = { ...config, enableVariantSelectors: true };
    render(
      <CardRenderer
        card={makeCard({
          variants: [{ name: 'Size', options: ['S', 'M', 'L'], selected: 'M' }],
        })}
        theme={theme}
        config={variantConfig}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('S')).toBeDefined();
    expect(screen.getByText('M')).toBeDefined();
    expect(screen.getByText('L')).toBeDefined();
  });

  test('does not render variants when disabled in config', () => {
    render(
      <CardRenderer
        card={makeCard({
          variants: [{ name: 'Size', options: ['S', 'M'] }],
        })}
        theme={theme}
        config={config} // enableVariantSelectors: false
        onClick={() => {}}
      />,
    );
    expect(screen.queryByText('S')).toBeNull();
  });

  test('shows imagePlaceholderText when no image', () => {
    const placeholderConfig = { ...config, imagePlaceholderText: 'Demo product' };
    render(
      <CardRenderer
        card={makeCard()}
        theme={theme}
        config={placeholderConfig}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText('Demo product')).toBeDefined();
  });

  test('has aria-label for accessibility', () => {
    const { container } = render(
      <CardRenderer card={makeCard({ title: 'My Item' })} theme={theme} config={config} onClick={() => {}} />,
    );
    expect(container.querySelector('[aria-label="View My Item"]')).not.toBeNull();
  });
});
