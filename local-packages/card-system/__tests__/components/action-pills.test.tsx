import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionPills } from '../../src/components/ActionPills.js';
import type { ChatAction, CardTheme } from '../../src/types.js';

const theme: CardTheme['action'] = {
  primaryBg: '#111827',
  primaryText: '#ffffff',
  secondaryBg: '#f3f4f6',
  secondaryText: '#374151',
  border: '#d1d5db',
  hoverBg: '#1f2937',
};

function makeAction(overrides: Partial<ChatAction> = {}): ChatAction {
  return {
    id: 'act-1',
    label: 'Click me',
    type: 'navigate',
    payload: '/test',
    ...overrides,
  };
}

describe('ActionPills', () => {
  test('renders null when actions is empty', () => {
    const { container } = render(
      <ActionPills actions={[]} theme={theme} onAction={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders a button for each action', () => {
    const actions = [
      makeAction({ id: 'a1', label: 'Buy now' }),
      makeAction({ id: 'a2', label: 'Learn more' }),
    ];
    render(<ActionPills actions={actions} theme={theme} onAction={() => {}} />);
    expect(screen.getByText('Buy now')).toBeDefined();
    expect(screen.getByText('Learn more')).toBeDefined();
  });

  test('calls onAction with the clicked action', () => {
    const onAction = vi.fn();
    const action = makeAction({ id: 'a1', label: 'Buy now' });
    render(<ActionPills actions={[action]} theme={theme} onAction={onAction} />);

    fireEvent.click(screen.getByText('Buy now'));
    expect(onAction).toHaveBeenCalledWith(action);
  });

  test('renders primary style by default', () => {
    const action = makeAction({ id: 'a1', label: 'Primary' });
    render(<ActionPills actions={[action]} theme={theme} onAction={() => {}} />);
    const btn = screen.getByText('Primary');
    // jsdom converts hex to rgb
    expect(btn.style.background).toContain('17, 24, 39');
  });

  test('renders secondary style when specified', () => {
    const action = makeAction({ id: 'a1', label: 'Secondary', style: 'secondary' });
    render(<ActionPills actions={[action]} theme={theme} onAction={() => {}} />);
    const btn = screen.getByText('Secondary');
    expect(btn.style.background).toContain('243, 244, 246');
  });

  test('renders ghost style when specified', () => {
    const action = makeAction({ id: 'a1', label: 'Ghost', style: 'ghost' });
    render(<ActionPills actions={[action]} theme={theme} onAction={() => {}} />);
    const btn = screen.getByText('Ghost');
    expect(btn.style.background).toBe('transparent');
  });

  test('falls back to primary for unknown style', () => {
    const action = makeAction({ id: 'a1', label: 'Fallback', style: 'unknown' as ChatAction['style'] });
    render(<ActionPills actions={[action]} theme={theme} onAction={() => {}} />);
    const btn = screen.getByText('Fallback');
    expect(btn.style.background).toContain('17, 24, 39');
  });
});
