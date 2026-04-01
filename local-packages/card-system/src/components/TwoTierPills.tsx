/**
 * Two-Tier Pill Components
 *
 * ActionPill — heavy visual weight, triggers operations (e.g. "Draft emails", "Generate posts")
 * MessagePill — light visual weight, sends conversational text (e.g. "Tell me more", "What about...")
 * PillContainer — renders mixed pill arrays with rapid-click debounce on action pills
 */

'use client';

import { useState, useCallback, useRef, type CSSProperties } from 'react';

// ─── Types ──────────────────────────────────────────────────────────

export interface ActionPillData {
  type: 'action';
  label: string;
  payload: Record<string, unknown>;
}

export interface MessagePillData {
  type: 'message';
  label: string;
  payload: Record<string, unknown>;
}

export type PillData = ActionPillData | MessagePillData;

export interface ActionPillThemeProps {
  variant: 'solid' | 'outline';
  colorScheme: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
}

export interface MessagePillThemeProps {
  variant: 'ghost' | 'subtle';
  colorScheme: string;
  borderRadius: 'sm' | 'md' | 'lg' | 'full';
}

// ─── Theme helpers ──────────────────────────────────────────────────

const RADIUS_MAP: Record<string, string> = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  full: '9999px',
};

// ─── ActionPill ─────────────────────────────────────────────────────

interface ActionPillProps {
  pill: ActionPillData;
  theme?: ActionPillThemeProps;
  disabled?: boolean;
  loading?: boolean;
  onAction: (pill: ActionPillData) => void;
}

export function ActionPill({
  pill,
  theme = { variant: 'solid', colorScheme: 'primary', borderRadius: 'md' },
  disabled = false,
  loading = false,
  onAction,
}: ActionPillProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isDisabled = disabled || loading;

  const baseStyle: CSSProperties = {
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: RADIUS_MAP[theme.borderRadius],
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    minHeight: '44px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    opacity: isDisabled ? 0.6 : 1,
    border: theme.variant === 'outline' ? '2px solid #111827' : 'none',
    background:
      theme.variant === 'solid'
        ? isHovered
          ? '#1f2937'
          : '#111827'
        : isHovered
          ? '#f3f4f6'
          : 'transparent',
    color: theme.variant === 'solid' ? '#ffffff' : '#111827',
    boxShadow: isHovered && !isDisabled ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
  };

  return (
    <button
      type="button"
      style={baseStyle}
      disabled={isDisabled}
      onClick={() => !isDisabled && onAction(pill)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {loading ? '...' : pill.label}
    </button>
  );
}

// ─── MessagePill ────────────────────────────────────────────────────

interface MessagePillProps {
  pill: MessagePillData;
  theme?: MessagePillThemeProps;
  disabled?: boolean;
  onMessage: (pill: MessagePillData) => void;
}

export function MessagePill({
  pill,
  theme = { variant: 'ghost', colorScheme: 'neutral', borderRadius: 'full' },
  disabled = false,
  onMessage,
}: MessagePillProps) {
  const [isHovered, setIsHovered] = useState(false);

  const baseStyle: CSSProperties = {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 400,
    borderRadius: RADIUS_MAP[theme.borderRadius],
    cursor: disabled ? 'not-allowed' : 'pointer',
    minHeight: '36px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    opacity: disabled ? 0.5 : 1,
    border: theme.variant === 'subtle' ? '1px solid #e5e7eb' : 'none',
    background:
      theme.variant === 'subtle'
        ? isHovered
          ? '#f3f4f6'
          : '#f9fafb'
        : isHovered
          ? '#f3f4f6'
          : 'transparent',
    color: '#6b7280',
  };

  return (
    <button
      type="button"
      style={baseStyle}
      disabled={disabled}
      onClick={() => !disabled && onMessage(pill)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {pill.label}
    </button>
  );
}

// ─── PillContainer ──────────────────────────────────────────────────

interface PillContainerProps {
  pills: PillData[];
  actionTheme?: ActionPillThemeProps;
  messageTheme?: MessagePillThemeProps;
  onAction: (pill: ActionPillData) => void;
  onMessage: (pill: MessagePillData) => void;
  /** Debounce interval for action pills in ms (default 500) */
  debounceMs?: number;
}

export function PillContainer({
  pills,
  actionTheme,
  messageTheme,
  onAction,
  onMessage,
  debounceMs = 500,
}: PillContainerProps) {
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAction = useCallback(
    (pill: ActionPillData) => {
      if (processingAction) return; // Already processing — debounce
      setProcessingAction(pill.label);
      onAction(pill);

      debounceRef.current = setTimeout(() => {
        setProcessingAction(null);
      }, debounceMs);
    },
    [processingAction, onAction, debounceMs],
  );

  if (!pills || pills.length === 0) return null;

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  };

  return (
    <div style={containerStyle}>
      {pills.map((pill, index) => {
        const key = `${pill.type}-${pill.label}-${index}`;
        if (pill.type === 'action') {
          return (
            <ActionPill
              key={key}
              pill={pill}
              theme={actionTheme}
              loading={processingAction === pill.label}
              disabled={processingAction !== null}
              onAction={handleAction}
            />
          );
        }
        return (
          <MessagePill
            key={key}
            pill={pill}
            theme={messageTheme}
            disabled={processingAction !== null}
            onMessage={onMessage}
          />
        );
      })}
    </div>
  );
}
