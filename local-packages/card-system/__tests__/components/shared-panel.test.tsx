import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SharedPanel, PanelItemRenderer } from '../../src/components/SharedPanel.js';
import type { PanelItem } from '../../src/hooks/usePanel.js';

function makeItem(id: string, overrides: Partial<PanelItem> = {}): PanelItem {
  return {
    id,
    type: 'test-card',
    cardId: `card-${id}`,
    data: { title: `Item ${id}`, description: `Description for ${id}` },
    pinned: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('SharedPanel', () => {
  test('shows empty state when items array is empty', () => {
    render(<SharedPanel items={[]} />);
    expect(screen.getByText('Artifacts will appear here')).toBeDefined();
  });

  test('renders items when provided', () => {
    const items = [makeItem('a'), makeItem('b')];
    render(<SharedPanel items={items} />);
    expect(screen.getByText('Item a')).toBeDefined();
    expect(screen.getByText('Item b')).toBeDefined();
  });

  test('shows item type label in header', () => {
    render(<SharedPanel items={[makeItem('a', { type: 'campaign-summary' })]} />);
    expect(screen.getByText('campaign-summary')).toBeDefined();
  });

  test('shows description when present', () => {
    render(<SharedPanel items={[makeItem('a')]} />);
    expect(screen.getByText('Description for a')).toBeDefined();
  });

  test('falls back to item.type when no data.title', () => {
    const item = makeItem('a', { type: 'brand-profile', data: {} });
    render(<SharedPanel items={[item]} />);
    // DefaultPanelContent: (item.data.title as string) || item.type
    const texts = screen.getAllByText('brand-profile');
    // Should appear both in header label and as content title fallback
    expect(texts.length).toBeGreaterThanOrEqual(2);
  });

  test('uses custom renderCard when provided', () => {
    const renderCard = (item: PanelItem) => <div>Custom: {item.id}</div>;
    render(<SharedPanel items={[makeItem('x')]} renderCard={renderCard} />);
    expect(screen.getByText('Custom: x')).toBeDefined();
  });
});

describe('SharedPanel: AgentProgressCard rendering', () => {
  test('renders AgentProgressCard when item.type is agent-progress', () => {
    const progressItem = makeItem('progress-1', {
      type: 'agent-progress',
      data: {
        agentType: 'campaign',
        currentPhaseId: 'brand-analysis',
        currentPhaseLabel: 'Analyzing brand',
        phaseIndex: 0,
        totalPhases: 4,
        percent: 25,
        status: 'running',
        startedAt: Date.now(),
        phasesCompleted: [],
      },
    });
    render(<SharedPanel items={[progressItem]} />);
    // AgentProgressCard renders the phase label
    expect(screen.getByText('Analyzing brand')).toBeDefined();
    // It should render "Phase 1 of 4"
    expect(screen.getByText('Phase 1 of 4')).toBeDefined();
    expect(screen.getByText('25%')).toBeDefined();
  });

  test('renders custom renderCard for non-progress items (no regression)', () => {
    const renderCard = (item: PanelItem) => <div>Custom: {item.id}</div>;
    const regularItem = makeItem('regular');
    const progressItem = makeItem('progress', {
      type: 'agent-progress',
      data: {
        agentType: 'social',
        currentPhaseId: 'brand-analysis',
        currentPhaseLabel: 'Analyzing brand',
        phaseIndex: 0,
        totalPhases: 3,
        percent: 0,
        status: 'running',
        startedAt: Date.now(),
        phasesCompleted: [],
      },
    });
    render(<SharedPanel items={[regularItem, progressItem]} renderCard={renderCard} />);
    // Regular item uses custom renderCard
    expect(screen.getByText('Custom: regular')).toBeDefined();
    // Progress item renders AgentProgressCard, not custom renderCard
    expect(screen.getByText('Analyzing brand')).toBeDefined();
  });
});

describe('PanelItemRenderer', () => {
  test('shows Pin button for unpinned items', () => {
    render(<PanelItemRenderer item={makeItem('a', { pinned: false })} />);
    expect(screen.getByText('Pin')).toBeDefined();
  });

  test('shows Unpin button for pinned items', () => {
    render(<PanelItemRenderer item={makeItem('a', { pinned: true })} />);
    expect(screen.getByText('Unpin')).toBeDefined();
  });

  test('shows remove button only for unpinned items', () => {
    const { container: unpinned } = render(
      <PanelItemRenderer item={makeItem('a', { pinned: false })} />,
    );
    expect(unpinned.querySelector('button')?.textContent).toBeDefined();
    // Remove button (×) should be present
    const buttons = Array.from(unpinned.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent === '×')).toBe(true);
  });

  test('hides remove button for pinned items', () => {
    const { container } = render(
      <PanelItemRenderer item={makeItem('a', { pinned: true })} />,
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent === '×')).toBe(false);
  });

  test('calls onPin when Pin button clicked', () => {
    const onPin = vi.fn();
    render(<PanelItemRenderer item={makeItem('test-id', { pinned: false })} onPin={onPin} />);
    fireEvent.click(screen.getByText('Pin'));
    expect(onPin).toHaveBeenCalledWith('test-id');
  });

  test('calls onUnpin when Unpin button clicked', () => {
    const onUnpin = vi.fn();
    render(<PanelItemRenderer item={makeItem('test-id', { pinned: true })} onUnpin={onUnpin} />);
    fireEvent.click(screen.getByText('Unpin'));
    expect(onUnpin).toHaveBeenCalledWith('test-id');
  });

  test('calls onRemove when × button clicked', () => {
    const onRemove = vi.fn();
    render(<PanelItemRenderer item={makeItem('test-id')} onRemove={onRemove} />);
    fireEvent.click(screen.getByText('×'));
    expect(onRemove).toHaveBeenCalledWith('test-id');
  });
});
