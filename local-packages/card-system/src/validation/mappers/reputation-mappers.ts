/**
 * Reputation Scout Card Mappers
 *
 * Maps three-pillar assessment data to ValidatedCards.
 * All three types use emitDirect() since assessment data is computed
 * in-memory, not stored in a BIB DB table.
 *
 * assessment-summary: Overall score + three pillar mini-scores
 * pillar-detail: Per-pillar score, grade, signal breakdown
 * gap-recommendation: Gap name, severity, offering, impact
 */

import { registerCardMapper } from '../build-card.js';

// ---------------------------------------------------------------------------
// Record interfaces
// ---------------------------------------------------------------------------

interface AssessmentSummaryRecord {
  id: string;
  domain: string;
  businessName?: string;
  overallScore: number;
  pillars: Array<{
    pillar: string;
    score: number;
    grade: string;
    gapCount: number;
  }>;
  recommendationCount: number;
  partial?: boolean;
  assessedAt?: string;
}

interface PillarDetailRecord {
  id: string;
  domain: string;
  pillar: string;
  score: number;
  grade: string;
  gapCount: number;
  signals: Array<{
    signal: string;
    score: number;
    value?: string;
    detail?: string;
    confidence?: string;
  }>;
}

interface GapRecommendationRecord {
  id: string;
  domain: string;
  signal: string;
  currentScore: number;
  severity: string;
  pillar: string;
  offering?: string;
  impact?: string;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerReputationCardMappers(): void {
  registerCardMapper<AssessmentSummaryRecord>('assessment-summary', (record, tenantId) => ({
    type: 'assessment-summary',
    id: record.id,
    data: {
      domain: record.domain,
      businessName: record.businessName,
      overallScore: record.overallScore,
      pillars: record.pillars.map((p) => ({
        pillar: p.pillar,
        score: p.score,
        grade: p.grade,
        gapCount: p.gapCount,
      })),
      recommendationCount: record.recommendationCount,
      partial: record.partial ?? false,
      assessedAt: record.assessedAt,
    },
    source: {
      table: 'computed',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<PillarDetailRecord>('pillar-detail', (record, tenantId) => ({
    type: 'pillar-detail',
    id: record.id,
    data: {
      domain: record.domain,
      pillar: record.pillar,
      score: record.score,
      grade: record.grade,
      gapCount: record.gapCount,
      signals: record.signals.map((s) => ({
        signal: s.signal,
        score: s.score,
        value: s.value,
        detail: s.detail,
        confidence: s.confidence,
      })),
    },
    source: {
      table: 'computed',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<GapRecommendationRecord>('gap-recommendation', (record, tenantId) => ({
    type: 'gap-recommendation',
    id: record.id,
    data: {
      domain: record.domain,
      signal: record.signal,
      currentScore: record.currentScore,
      severity: record.severity,
      pillar: record.pillar,
      offering: record.offering,
      impact: record.impact,
    },
    source: {
      table: 'computed',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}
