/**
 * VoiceButton Component
 *
 * Microphone button for voice input in the chat widget.
 */

import React from 'react';

export interface VoiceButtonProps {
  /** Whether currently recording */
  isRecording: boolean;
  /** Whether processing the recording */
  isProcessing: boolean;
  /** Recording duration in milliseconds */
  durationMs?: number;
  /** Whether voice is supported */
  isSupported: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Primary color for styling */
  primaryColor?: string;
  /** Whether using dark theme */
  isDark?: boolean;
  /** Click handler */
  onClick: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Format duration in seconds
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${seconds}s`;
}

/**
 * VoiceButton - Microphone button for voice recording
 */
export function VoiceButton({
  isRecording,
  isProcessing,
  durationMs = 0,
  isSupported,
  disabled = false,
  primaryColor = '#3B82F6',
  isDark = false,
  onClick,
  className,
}: VoiceButtonProps) {
  if (!isSupported) {
    return null;
  }

  const isActive = isRecording || isProcessing;
  const buttonDisabled = disabled || isProcessing;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={buttonDisabled}
      className={className}
      style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        border: 'none',
        backgroundColor: isRecording
          ? '#EF4444' // Red when recording
          : isProcessing
          ? isDark
            ? '#374151'
            : '#E5E7EB'
          : isDark
          ? '#374151'
          : '#F3F4F6',
        color: isRecording
          ? '#FFFFFF'
          : isDark
          ? '#D1D5DB'
          : '#6B7280',
        cursor: buttonDisabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        opacity: buttonDisabled ? 0.5 : 1,
        position: 'relative',
        flexShrink: 0,
      }}
      aria-label={
        isProcessing
          ? 'Processing voice...'
          : isRecording
          ? 'Stop recording'
          : 'Start voice recording'
      }
      title={
        isProcessing
          ? 'Processing...'
          : isRecording
          ? `Recording... ${formatDuration(durationMs)}`
          : 'Voice input'
      }
    >
      {isProcessing ? (
        // Loading spinner
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            animation: 'spin 1s linear infinite',
          }}
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      ) : isRecording ? (
        // Stop icon (square)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        // Microphone icon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1a1 1 0 1 0-2 0v1a9 9 0 0 0 8 8.94V22h-2a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.06A9 9 0 0 0 21 11v-1a1 1 0 1 0-2 0z" />
        </svg>
      )}

      {/* Recording pulse animation */}
      {isRecording && (
        <span
          style={{
            position: 'absolute',
            inset: '-4px',
            borderRadius: '50%',
            border: '2px solid #EF4444',
            opacity: 0.5,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Inline keyframes for animations */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.2); opacity: 0; }
          }
        `}
      </style>
    </button>
  );
}
