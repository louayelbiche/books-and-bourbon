/**
 * AI Advisor Card Mappers
 *
 * Maps MetricResult and AdvisorInsight records to ValidatedCards.
 *
 * advisor-metric: Computed on-the-fly metrics (source.table = 'computed').
 *   Uses emitDirect() — no DB round-trip needed.
 *
 * advisor-insight: DB-backed proactive insights (source.table = 'AdvisorInsight').
 *   Can use the full buildCardFromDB() pipeline.
 */

import { registerCardMapper } from '../build-card.js';

// ---------------------------------------------------------------------------
// Record interfaces (match the shapes passed to mappers at runtime)
// ---------------------------------------------------------------------------

interface MetricResultRecord {
  id: string;
  label: string;
  value: number;
  formatted: string;
  unit: string;
  trend?: {
    direction: string;
    percentageChange: number;
    formatted: string;
    comparedTo: string;
  };
  breakdown?: Array<{
    label: string;
    value: number;
    formatted: string;
    percentage?: number;
  }>;
}

interface AdvisorInsightRecord {
  id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  description: string;
  advice: string;
  data?: Record<string, unknown> | null;
  metricIds?: string[];
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerAdvisorCardMappers(): void {
  registerCardMapper<MetricResultRecord>('advisor-metric', (record, tenantId) => ({
    type: 'advisor-metric',
    id: record.id,
    data: {
      label: record.label,
      formatted: record.formatted,
      unit: record.unit,
      trend: record.trend
        ? {
            direction: record.trend.direction,
            formatted: record.trend.formatted,
          }
        : undefined,
      breakdown: record.breakdown?.map((b) => ({
        label: b.label,
        formatted: b.formatted,
        percentage: b.percentage,
      })),
    },
    source: {
      table: 'computed',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<AdvisorInsightRecord>('advisor-insight', (record, tenantId) => ({
    type: 'advisor-insight',
    id: record.id,
    data: {
      insightType: record.type,
      category: record.category,
      priority: record.priority,
      title: record.title,
      description: record.description,
      actionableAdvice: record.advice,
      metricIds: record.metricIds ?? [],
    },
    source: {
      table: 'AdvisorInsight',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}
