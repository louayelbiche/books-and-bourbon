/**
 * SharedPanel — Reusable side panel for agent card artifacts
 *
 * Renders stacked panel items with scroll. Always visible on desktop (right side).
 * Items ordered newest-on-top. Supports pinning and variable item heights.
 */

'use client';

import { type CSSProperties } from 'react';
import type { PanelItem } from '../hooks/usePanel.js';
import { AgentProgressCard } from './AgentProgressCard.js';
import type { ProgressData } from './AgentProgressCard.js';

// ─── PanelItemRenderer ─────────────────────────────────────────────

interface PanelItemRendererProps {
  item: PanelItem;
  onPin?: (itemId: string) => void;
  onUnpin?: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
  onCopy?: (item: PanelItem) => void;
  onDownload?: (item: PanelItem) => void;
  /** Item ID currently showing "Copied!" feedback, or null. */
  copyingId?: string | null;
  renderCard?: (item: PanelItem) => React.ReactNode;
}

export function PanelItemRenderer({
  item,
  onPin,
  onUnpin,
  onRemove,
  onCopy,
  onDownload,
  copyingId,
  renderCard,
}: PanelItemRendererProps) {
  const itemStyle: CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    position: 'relative',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '11px',
    color: '#9ca3af',
  };

  const buttonStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: '11px',
    color: '#9ca3af',
  };

  return (
    <div style={itemStyle}>
      <div style={headerStyle}>
        <span>{item.type}</span>
        <span style={{ display: 'flex', gap: '4px' }}>
          {onCopy && (
            <button type="button" style={buttonStyle} onClick={() => onCopy(item)}>
              {copyingId === item.id ? 'Copied!' : 'Copy'}
            </button>
          )}
          {onDownload && (
            <button type="button" style={buttonStyle} onClick={() => onDownload(item)}>
              Save
            </button>
          )}
          {item.pinned ? (
            <button type="button" style={buttonStyle} onClick={() => onUnpin?.(item.id)}>
              Unpin
            </button>
          ) : (
            <button type="button" style={buttonStyle} onClick={() => onPin?.(item.id)}>
              Pin
            </button>
          )}
          {!item.pinned && (
            <button type="button" style={buttonStyle} onClick={() => onRemove?.(item.id)}>
              ×
            </button>
          )}
        </span>
      </div>
      {item.type === 'agent-progress'
        ? <AgentProgressCard data={item.data as unknown as ProgressData} />
        : renderCard ? renderCard(item) : <DefaultPanelContent item={item} />}
    </div>
  );
}

function DefaultPanelContent({ item }: { item: PanelItem }) {
  const contentStyle: CSSProperties = {
    fontSize: '13px',
    color: '#374151',
    lineHeight: 1.5,
  };

  return (
    <div style={contentStyle}>
      <div style={{ fontWeight: 500, marginBottom: '4px' }}>
        {(item.data.title as string) || item.type}
      </div>
      {item.data.description != null && (
        <div style={{ color: '#6b7280', fontSize: '12px' }}>
          {String(item.data.description)}
        </div>
      )}
    </div>
  );
}

// ─── SharedPanel ────────────────────────────────────────────────────

interface SharedPanelProps {
  items: PanelItem[];
  position?: 'right' | 'bottom';
  onPin?: (itemId: string) => void;
  onUnpin?: (itemId: string) => void;
  onRemove?: (itemId: string) => void;
  onCopy?: (item: PanelItem) => void;
  onDownload?: (item: PanelItem) => void;
  /** Item ID currently showing "Copied!" feedback, or null. */
  copyingId?: string | null;
  /** Custom renderer for panel item content */
  renderCard?: (item: PanelItem) => React.ReactNode;
}

export function SharedPanel({
  items,
  position = 'right',
  onPin,
  onUnpin,
  onRemove,
  onCopy,
  onDownload,
  copyingId,
  renderCard,
}: SharedPanelProps) {
  const isVertical = position === 'right';

  const panelStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '12px',
    overflowY: 'auto',
    height: isVertical ? '100%' : undefined,
    maxHeight: isVertical ? undefined : '40vh',
    minWidth: isVertical ? '320px' : undefined,
    borderLeft: isVertical ? '1px solid #e5e7eb' : undefined,
    borderTop: !isVertical ? '1px solid #e5e7eb' : undefined,
    background: '#fafafa',
  };

  const emptyStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '120px',
    color: '#9ca3af',
    fontSize: '13px',
    fontStyle: 'italic',
  };

  if (items.length === 0) {
    return (
      <div style={panelStyle}>
        <div style={emptyStyle}>Artifacts will appear here</div>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      {items.map((item) => (
        <PanelItemRenderer
          key={item.id}
          item={item}
          onPin={onPin}
          onUnpin={onUnpin}
          onRemove={onRemove}
          onCopy={onCopy}
          onDownload={onDownload}
          copyingId={copyingId}
          renderCard={renderCard}
        />
      ))}
    </div>
  );
}
