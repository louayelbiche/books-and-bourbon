import { describe, test, expect, beforeAll } from 'vitest';
import { registerAdvisorCardMappers } from '../src/validation/mappers/advisor-mappers.js';
import { buildCardFromDB } from '../src/validation/build-card.js';
import type { AgentCardType } from '../src/validation/types.js';

// Valid UUID v4 test IDs (buildCardFromDB validates record ID format)
const METRIC_ID = 'a0000000-0000-4000-8000-000000000001';
const INSIGHT_ID = 'a0000000-0000-4000-8000-000000000010';
const TENANT_ID = 'tenant-test-001';

// Register mappers once before all tests
beforeAll(() => {
  registerAdvisorCardMappers();
});

// Helper: create a query function that returns the given record
function queryReturning(record: unknown) {
  return async (_type: AgentCardType, _recordId: string, _tenantId: string) => record;
}

describe('advisor-metric mapper', () => {
  const fullMetric = {
    id: METRIC_ID,
    label: 'Total Revenue (This Month)',
    value: 245800,
    formatted: '$2,458.00',
    unit: 'currency',
    trend: {
      direction: 'up',
      percentageChange: 15.2,
      formatted: '+15.2%',
      comparedTo: 'last_month',
    },
    breakdown: [
      { label: 'Product A', value: 120000, formatted: '$1,200.00', percentage: 48.8 },
      { label: 'Product B', value: 80000, formatted: '$800.00', percentage: 32.6 },
    ],
  };

  test('maps full MetricResult to ValidatedCard', async () => {
    const result = await buildCardFromDB(
      'advisor-metric' as AgentCardType,
      METRIC_ID,
      TENANT_ID,
      queryReturning(fullMetric),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const card = result.card;
    expect(card.type).toBe('advisor-metric');
    expect(card.id).toBe(METRIC_ID);
    expect(card.source.table).toBe('computed');
    expect(card.source.recordId).toBe(METRIC_ID);
    expect(card.source.tenantId).toBe(TENANT_ID);
    expect(card.data.label).toBe('Total Revenue (This Month)');
    expect(card.data.formatted).toBe('$2,458.00');
    expect(card.data.unit).toBe('currency');
    expect(card.data.trend).toEqual({
      direction: 'up',
      formatted: '+15.2%',
    });
    expect(card.data.breakdown).toEqual([
      { label: 'Product A', formatted: '$1,200.00', percentage: 48.8 },
      { label: 'Product B', formatted: '$800.00', percentage: 32.6 },
    ]);
  });

  test('maps MetricResult with no trend and no breakdown (EC-08)', async () => {
    const minimalMetricId = 'a0000000-0000-4000-8000-000000000002';
    const minimalMetric = {
      id: minimalMetricId,
      label: 'Active Bookings',
      value: 12,
      formatted: '12',
      unit: 'count',
    };

    const result = await buildCardFromDB(
      'advisor-metric' as AgentCardType,
      minimalMetricId,
      TENANT_ID,
      queryReturning(minimalMetric),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const card = result.card;
    expect(card.type).toBe('advisor-metric');
    expect(card.data.trend).toBeUndefined();
    expect(card.data.breakdown).toBeUndefined();
    expect(card.data.formatted).toBe('12');
    expect(card.data.unit).toBe('count');
  });

  test('sets source.table to "computed" (not a real DB table)', async () => {
    const result = await buildCardFromDB(
      'advisor-metric' as AgentCardType,
      METRIC_ID,
      TENANT_ID,
      queryReturning(fullMetric),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.card.source.table).toBe('computed');
  });
});

describe('advisor-insight mapper', () => {
  const fullInsight = {
    id: INSIGHT_ID,
    type: 'REVENUE_DECLINING',
    category: 'revenue',
    priority: 'high',
    title: 'Revenue declined 15% this week',
    description: 'Weekly revenue dropped from $3,200 to $2,720 compared to last week.',
    advice: 'Consider running a targeted promotion or reviewing pricing strategy.',
    data: { weeklyDelta: -480 },
    metricIds: ['total_revenue_week'],
  };

  test('maps full AdvisorInsight to ValidatedCard', async () => {
    const result = await buildCardFromDB(
      'advisor-insight' as AgentCardType,
      INSIGHT_ID,
      TENANT_ID,
      queryReturning(fullInsight),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const card = result.card;
    expect(card.type).toBe('advisor-insight');
    expect(card.id).toBe(INSIGHT_ID);
    expect(card.source.table).toBe('AdvisorInsight');
    expect(card.source.recordId).toBe(INSIGHT_ID);
    expect(card.source.tenantId).toBe(TENANT_ID);
    expect(card.data.insightType).toBe('REVENUE_DECLINING');
    expect(card.data.category).toBe('revenue');
    expect(card.data.priority).toBe('high');
    expect(card.data.title).toBe('Revenue declined 15% this week');
    expect(card.data.description).toContain('Weekly revenue dropped');
    expect(card.data.actionableAdvice).toContain('targeted promotion');
    expect(card.data.metricIds).toEqual(['total_revenue_week']);
  });

  test('maps DB field "advice" to data.actionableAdvice', async () => {
    const result = await buildCardFromDB(
      'advisor-insight' as AgentCardType,
      INSIGHT_ID,
      TENANT_ID,
      queryReturning(fullInsight),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.card.data.actionableAdvice).toBe(fullInsight.advice);
  });

  test('handles optional fields (no data, no metricIds)', async () => {
    const minimalInsight = {
      id: INSIGHT_ID,
      type: 'STALE_CONTENT',
      category: 'content',
      priority: 'low',
      title: 'Content is stale',
      description: 'No new content published in 7 days.',
      advice: 'Consider publishing a blog post or updating existing content.',
    };

    const result = await buildCardFromDB(
      'advisor-insight' as AgentCardType,
      INSIGHT_ID,
      TENANT_ID,
      queryReturning(minimalInsight),
    );

    expect(result.success).toBe(true);
    if (!result.success) return;

    const card = result.card;
    expect(card.data.metricIds).toEqual([]);
    expect(card.data.priority).toBe('low');
    expect(card.data.category).toBe('content');
  });

  test('returns failure when record not found', async () => {
    const queryNull = async () => null;

    const result = await buildCardFromDB(
      'advisor-insight' as AgentCardType,
      INSIGHT_ID,
      TENANT_ID,
      queryNull,
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.reason).toBe('record_not_found');
  });
});
