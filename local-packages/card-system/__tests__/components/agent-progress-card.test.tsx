import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentProgressCard, type ProgressData } from '../../src/components/AgentProgressCard.js';

function makeProgress(overrides: Partial<ProgressData> = {}): ProgressData {
  return {
    agentType: 'campaign',
    currentPhaseId: 'brand-analysis',
    currentPhaseLabel: 'Analyzing brand',
    phaseIndex: 0,
    totalPhases: 4,
    percent: 0,
    status: 'running',
    startedAt: Date.now(),
    phasesCompleted: [],
    ...overrides,
  };
}

describe('AgentProgressCard', () => {
  test('renders phase label when running', () => {
    render(<AgentProgressCard data={makeProgress()} />);
    expect(screen.getByText('Analyzing brand')).toBeDefined();
  });

  test('renders phase counter', () => {
    render(<AgentProgressCard data={makeProgress({ phaseIndex: 1, totalPhases: 4 })} />);
    expect(screen.getByText('Phase 2 of 4')).toBeDefined();
  });

  test('renders percentage', () => {
    render(<AgentProgressCard data={makeProgress({ percent: 45 })} />);
    expect(screen.getByText('45%')).toBeDefined();
  });

  test('renders error message when status is error', () => {
    render(
      <AgentProgressCard
        data={makeProgress({
          status: 'error',
          error: 'The AI service is temporarily unavailable.',
        })}
      />,
    );
    expect(screen.getByText('The AI service is temporarily unavailable.')).toBeDefined();
  });

  test('renders completion summary when status is completed', () => {
    render(
      <AgentProgressCard
        data={makeProgress({
          status: 'completed',
          percent: 100,
          currentPhaseLabel: 'Complete',
          completedAt: Date.now(),
          durationMs: 12500,
          phasesCompleted: ['brand-analysis', 'recipient-generation', 'email-drafting', 'review'],
          toolsUsed: ['analyze_brand', 'generate_recipients', 'draft_emails'],
        })}
      />,
    );
    expect(screen.getByText('Complete')).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
    // Duration: 12500ms = 13s (rounded)
    expect(screen.getByText(/Completed in 13s/)).toBeDefined();
    expect(screen.getByText(/4 phases/)).toBeDefined();
    expect(screen.getByText(/3 tools used/)).toBeDefined();
  });

  test('renders duration in minutes format for longer operations', () => {
    render(
      <AgentProgressCard
        data={makeProgress({
          status: 'completed',
          percent: 100,
          currentPhaseLabel: 'Complete',
          durationMs: 95000,
          phasesCompleted: ['a'],
        })}
      />,
    );
    expect(screen.getByText(/1m 35s/)).toBeDefined();
  });

  test('does not render error section when running', () => {
    const { container } = render(<AgentProgressCard data={makeProgress()} />);
    // Error style has color: #dc2626
    const errorElements = container.querySelectorAll('[style*="dc2626"]');
    expect(errorElements.length).toBe(0);
  });

  test('does not render completion summary when running', () => {
    const { container } = render(<AgentProgressCard data={makeProgress()} />);
    // Summary style has color: #6b7280
    // But we cannot check absence by style alone; just verify "Completed in" is not present
    expect(container.textContent).not.toContain('Completed in');
  });
});
