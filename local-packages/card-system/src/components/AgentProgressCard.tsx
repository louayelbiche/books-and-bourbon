'use client';

import { type CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Types (mirrored from apps/web/lib/agent-progress.ts to avoid cross-package dep)
// ---------------------------------------------------------------------------

export interface ProgressData {
  agentType: string;
  currentPhaseId: string;
  currentPhaseLabel: string;
  phaseIndex: number;
  totalPhases: number;
  percent: number;
  status: 'running' | 'completed' | 'error';
  error?: string;
  startedAt: number;
  completedAt?: number;
  phasesCompleted: string[];
  toolsUsed?: string[];
  durationMs?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const containerStyle: CSSProperties = {
  padding: '12px 0 0',
};

const labelStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '8px',
};

const barTrackStyle: CSSProperties = {
  width: '100%',
  height: '6px',
  background: '#e5e7eb',
  borderRadius: '3px',
  overflow: 'hidden',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '6px',
  fontSize: '11px',
  color: '#9ca3af',
};

const errorStyle: CSSProperties = {
  fontSize: '12px',
  color: '#dc2626',
  marginTop: '8px',
  lineHeight: 1.4,
};

const summaryStyle: CSSProperties = {
  fontSize: '12px',
  color: '#6b7280',
  marginTop: '8px',
  lineHeight: 1.4,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AgentProgressCardProps {
  data: ProgressData;
}

export function AgentProgressCard({ data }: AgentProgressCardProps) {
  const { status, percent, currentPhaseLabel, phaseIndex, totalPhases } = data;

  const barColor =
    status === 'error' ? '#dc2626' : status === 'completed' ? '#16a34a' : '#3b82f6';

  const barFillStyle: CSSProperties = {
    width: `${percent}%`,
    height: '100%',
    background: barColor,
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  };

  return (
    <div style={containerStyle}>
      {/* Phase label */}
      <div style={labelStyle}>{currentPhaseLabel}</div>

      {/* Progress bar */}
      <div style={barTrackStyle}>
        <div style={barFillStyle} />
      </div>

      {/* Phase counter + percentage */}
      <div style={metaStyle}>
        <span>
          Phase {phaseIndex + 1} of {totalPhases}
        </span>
        <span>{percent}%</span>
      </div>

      {/* Error message */}
      {status === 'error' && data.error && (
        <div style={errorStyle}>{data.error}</div>
      )}

      {/* Completion summary */}
      {status === 'completed' && (
        <div style={summaryStyle}>
          {data.durationMs != null && (
            <span>Completed in {formatDuration(data.durationMs)}</span>
          )}
          {data.phasesCompleted.length > 0 && (
            <span>
              {data.durationMs != null ? ' · ' : ''}
              {data.phasesCompleted.length} phase
              {data.phasesCompleted.length !== 1 ? 's' : ''}
            </span>
          )}
          {data.toolsUsed && data.toolsUsed.length > 0 && (
            <span>
              {' · '}
              {data.toolsUsed.length} tool
              {data.toolsUsed.length !== 1 ? 's' : ''} used
            </span>
          )}
        </div>
      )}
    </div>
  );
}
