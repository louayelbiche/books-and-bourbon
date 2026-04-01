import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardList } from '../../src/components/CardList.js';
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
  maxCardsPerMessage: 2,
  expandSteps: [2, 4],
  stalenessThresholdMs: 86400000,
  clickBehavior: 'new_tab',
  enableVariantSelectors: false,
  enableAddToCart: false,
};

function makeCard(id: string): ChatCard {
  return {
    id,
    type: 'product',
    title: `Product ${id}`,
    url: `https://example.com/${id}`,
    generatedAt: Date.now(),
  };
}

describe('CardList', () => {
  test('renders null when cards is empty', () => {
    const { container } = render(
      <CardList cards={[]} theme={theme} config={config} onCardClick={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders visible cards up to maxCardsPerMessage', () => {
    const cards = [makeCard('1'), makeCard('2'), makeCard('3'), makeCard('4')];
    render(<CardList cards={cards} theme={theme} config={config} onCardClick={() => {}} />);

    expect(screen.getByText('Product 1')).toBeDefined();
    expect(screen.getByText('Product 2')).toBeDefined();
    // Cards 3 and 4 should not be visible initially
    expect(screen.queryByText('Product 3')).toBeNull();
  });

  test('shows "Show more" button when cards exceed maxCardsPerMessage', () => {
    const cards = [makeCard('1'), makeCard('2'), makeCard('3')];
    render(<CardList cards={cards} theme={theme} config={config} onCardClick={() => {}} />);
    expect(screen.getByText('Show more (1 remaining)')).toBeDefined();
  });

  test('does not show "Show more" when all cards fit', () => {
    const cards = [makeCard('1'), makeCard('2')];
    render(<CardList cards={cards} theme={theme} config={config} onCardClick={() => {}} />);
    expect(screen.queryByText(/Show more/)).toBeNull();
  });

  test('clicking "Show more" reveals next batch via expandSteps', () => {
    const cards = [makeCard('1'), makeCard('2'), makeCard('3'), makeCard('4'), makeCard('5')];
    render(<CardList cards={cards} theme={theme} config={config} onCardClick={() => {}} />);

    // Initially 2 visible, button shows "3 remaining"
    expect(screen.getByText('Show more (3 remaining)')).toBeDefined();

    // Click → next step is 4
    fireEvent.click(screen.getByText('Show more (3 remaining)'));
    expect(screen.getByText('Product 3')).toBeDefined();
    expect(screen.getByText('Product 4')).toBeDefined();

    // Still 1 remaining
    expect(screen.getByText('Show more (1 remaining)')).toBeDefined();

    // Click again → no next step, show all
    fireEvent.click(screen.getByText('Show more (1 remaining)'));
    expect(screen.getByText('Product 5')).toBeDefined();
    expect(screen.queryByText(/Show more/)).toBeNull();
  });

  test('calls onCardClick when a card is clicked', () => {
    const onCardClick = vi.fn();
    const cards = [makeCard('1')];
    render(<CardList cards={cards} theme={theme} config={config} onCardClick={onCardClick} />);

    fireEvent.click(screen.getByText('Product 1'));
    expect(onCardClick).toHaveBeenCalledWith(cards[0]);
  });
});
