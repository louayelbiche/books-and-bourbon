'use client';

import { useState, type CSSProperties } from 'react';
import type { ChatAction, CardTheme } from '../types.js';

interface ActionPillsProps {
  actions: ChatAction[];
  theme: CardTheme['action'];
  onAction: (action: ChatAction) => void;
}

export function ActionPills({ actions, theme, onAction }: ActionPillsProps) {
  if (!actions || actions.length === 0) return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  };

  return (
    <div style={containerStyle}>
      {actions.map((action) => (
        <ActionPill
          key={action.id}
          action={action}
          theme={theme}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function ActionPill({
  action,
  theme,
  onAction,
}: {
  action: ChatAction;
  theme: CardTheme['action'];
  onAction: (action: ChatAction) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const style = action.style || 'primary';

  const baseStyle: CSSProperties = {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '20px',
    cursor: 'pointer',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s, color 0.2s',
    border: 'none',
    whiteSpace: 'nowrap',
  };

  const styleMap: Record<string, CSSProperties> = {
    primary: {
      ...baseStyle,
      background: isHovered ? theme.hoverBg : theme.primaryBg,
      color: theme.primaryText,
    },
    secondary: {
      ...baseStyle,
      background: isHovered ? theme.hoverBg : theme.secondaryBg,
      color: isHovered ? theme.primaryText : theme.secondaryText,
      border: `1px solid ${theme.border}`,
    },
    ghost: {
      ...baseStyle,
      background: 'transparent',
      color: theme.secondaryText,
      textDecoration: isHovered ? 'underline' : 'none',
    },
  };

  return (
    <button
      type="button"
      style={styleMap[style] || styleMap.primary}
      onClick={() => onAction(action)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {action.label}
    </button>
  );
}
