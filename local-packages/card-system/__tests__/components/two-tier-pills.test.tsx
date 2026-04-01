import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActionPill, MessagePill, PillContainer } from '../../src/components/TwoTierPills.js';
import type { ActionPillData, MessagePillData } from '../../src/components/TwoTierPills.js';

describe('ActionPill', () => {
  const pill: ActionPillData = { type: 'action', label: 'Draft emails', payload: {} };

  test('renders label text', () => {
    render(<ActionPill pill={pill} onAction={() => {}} />);
    expect(screen.getByText('Draft emails')).toBeDefined();
  });

  test('calls onAction when clicked', () => {
    const onAction = vi.fn();
    render(<ActionPill pill={pill} onAction={onAction} />);
    fireEvent.click(screen.getByText('Draft emails'));
    expect(onAction).toHaveBeenCalledWith(pill);
  });

  test('shows "..." when loading', () => {
    render(<ActionPill pill={pill} loading onAction={() => {}} />);
    expect(screen.getByText('...')).toBeDefined();
    expect(screen.queryByText('Draft emails')).toBeNull();
  });

  test('disables button when disabled', () => {
    render(<ActionPill pill={pill} disabled onAction={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  test('does not call onAction when disabled', () => {
    const onAction = vi.fn();
    render(<ActionPill pill={pill} disabled onAction={onAction} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onAction).not.toHaveBeenCalled();
  });

  test('applies solid variant styling by default', () => {
    render(<ActionPill pill={pill} onAction={() => {}} />);
    const btn = screen.getByRole('button');
    // jsdom converts hex to rgb
    expect(btn.style.background).toContain('17, 24, 39');
    expect(btn.style.color).toContain('255, 255, 255');
  });

  test('applies outline variant styling', () => {
    render(
      <ActionPill
        pill={pill}
        theme={{ variant: 'outline', colorScheme: 'primary', borderRadius: 'md' }}
        onAction={() => {}}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.border).toContain('solid');
    expect(btn.style.background).toBe('transparent');
  });
});

describe('MessagePill', () => {
  const pill: MessagePillData = { type: 'message', label: 'Tell me more', payload: {} };

  test('renders label text', () => {
    render(<MessagePill pill={pill} onMessage={() => {}} />);
    expect(screen.getByText('Tell me more')).toBeDefined();
  });

  test('calls onMessage when clicked', () => {
    const onMessage = vi.fn();
    render(<MessagePill pill={pill} onMessage={onMessage} />);
    fireEvent.click(screen.getByText('Tell me more'));
    expect(onMessage).toHaveBeenCalledWith(pill);
  });

  test('does not call onMessage when disabled', () => {
    const onMessage = vi.fn();
    render(<MessagePill pill={pill} disabled onMessage={onMessage} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onMessage).not.toHaveBeenCalled();
  });

  test('applies ghost variant by default', () => {
    render(<MessagePill pill={pill} onMessage={() => {}} />);
    const btn = screen.getByRole('button');
    expect(btn.style.background).toBe('transparent');
  });

  test('applies subtle variant styling', () => {
    render(
      <MessagePill
        pill={pill}
        theme={{ variant: 'subtle', colorScheme: 'neutral', borderRadius: 'full' }}
        onMessage={() => {}}
      />,
    );
    const btn = screen.getByRole('button');
    // jsdom converts hex to rgb
    expect(btn.style.background).toContain('249, 250, 251');
    expect(btn.style.border).toContain('solid');
  });
});

describe('PillContainer', () => {
  const actionPill: ActionPillData = { type: 'action', label: 'Generate', payload: {} };
  const messagePill: MessagePillData = { type: 'message', label: 'Explain', payload: {} };

  test('renders null when pills is empty', () => {
    const { container } = render(
      <PillContainer pills={[]} onAction={() => {}} onMessage={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  test('renders mixed action and message pills', () => {
    render(
      <PillContainer
        pills={[actionPill, messagePill]}
        onAction={() => {}}
        onMessage={() => {}}
      />,
    );
    expect(screen.getByText('Generate')).toBeDefined();
    expect(screen.getByText('Explain')).toBeDefined();
  });

  test('debounces action pills after click', () => {
    vi.useFakeTimers();
    const onAction = vi.fn();

    render(
      <PillContainer
        pills={[actionPill, messagePill]}
        onAction={onAction}
        onMessage={() => {}}
        debounceMs={500}
      />,
    );

    // Click action pill
    fireEvent.click(screen.getByText('Generate'));
    expect(onAction).toHaveBeenCalledTimes(1);

    // During debounce, action pill shows '...' (loading state)
    expect(screen.getByText('...')).toBeDefined();

    // All buttons should be disabled during debounce
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.hasAttribute('disabled')).toBe(true);
    });

    // After debounce clears
    act(() => { vi.advanceTimersByTime(500); });

    // Buttons re-enabled
    expect(screen.getByText('Generate')).toBeDefined();
    expect(screen.queryByText('...')).toBeNull();

    vi.useRealTimers();
  });

  test('blocks second action click during debounce', () => {
    vi.useFakeTimers();
    const onAction = vi.fn();

    const pill2: ActionPillData = { type: 'action', label: 'Send', payload: {} };
    render(
      <PillContainer
        pills={[actionPill, pill2]}
        onAction={onAction}
        onMessage={() => {}}
        debounceMs={500}
      />,
    );

    fireEvent.click(screen.getByText('Generate'));
    expect(onAction).toHaveBeenCalledTimes(1);

    // Try clicking second action during debounce — both disabled
    // 'Send' button is disabled, clicking won't fire
    const sendBtn = screen.getByText('Send') as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);

    act(() => { vi.advanceTimersByTime(500); });
    vi.useRealTimers();
  });
});
