'use client';

import type { CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const PILLAR_LABELS: Record<string, string> = {
  digital_presence: 'Digital Presence',
  ai_leap: 'AI Leap',
  customer_connection: 'Customer Connection',
};

function scoreColor(score: number): string {
  if (score >= 80) return '#10B981';
  if (score >= 60) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

function gradeLabel(grade: string): string {
  return grade || '?';
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

// ---------------------------------------------------------------------------
// Assessment Summary Card
// ---------------------------------------------------------------------------

export interface AssessmentSummaryData {
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

export function AssessmentSummaryCard({ data }: { data: AssessmentSummaryData }) {
  const color = scoreColor(data.overallScore);

  const containerStyle: CSSProperties = {
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '16px',
    background: 'hsl(var(--card))',
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '14px',
  };

  const scoreCircleStyle: CSSProperties = {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    border: `3px solid ${color}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 700,
    color,
    flexShrink: 0,
  };

  const pillarsRowStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  };

  const pillarMiniStyle = (score: number): CSSProperties => ({
    padding: '8px',
    borderRadius: '6px',
    background: 'hsl(var(--muted))',
    textAlign: 'center',
    borderLeft: `3px solid ${scoreColor(score)}`,
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={scoreCircleStyle}>{data.overallScore}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            {data.businessName || data.domain}
          </div>
          <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
            {data.domain}
            {data.partial && <span style={{ color: '#F59E0B', marginLeft: '6px' }}>(partial)</span>}
          </div>
          <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginTop: '2px' }}>
            {data.recommendationCount} recommendation{data.recommendationCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={pillarsRowStyle}>
        {data.pillars.map((p) => (
          <div key={p.pillar} style={pillarMiniStyle(p.score)}>
            <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}>
              {PILLAR_LABELS[p.pillar] || p.pillar}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: scoreColor(p.score) }}>
              {p.score}
            </div>
            <div style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))' }}>
              {gradeLabel(p.grade)} {p.gapCount > 0 && `· ${p.gapCount} gap${p.gapCount > 1 ? 's' : ''}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pillar Detail Card
// ---------------------------------------------------------------------------

export interface PillarDetailData {
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

const SIGNAL_LABELS: Record<string, string> = {
  website_speed: 'Website Speed',
  mobile_friendly: 'Mobile Friendly',
  ssl_valid: 'SSL Certificate',
  framework_modern: 'Modern Framework',
  last_updated: 'Last Updated',
  seo_basics: 'SEO Basics',
  social_presence: 'Social Presence',
  social_activity: 'Social Activity',
  geo_readiness: 'GEO Readiness',
  ai_search_visibility: 'AI Search Visibility',
  structured_data: 'Structured Data',
  content_quality: 'Content Quality',
  chatbot_present: 'AI Chatbot',
  booking_system: 'Booking System',
  ordering_system: 'Ordering System',
  email_capture: 'Email Capture',
  review_response_rate: 'Review Response Rate',
  review_response_time: 'Response Time',
  contact_methods: 'Contact Methods',
  after_hours: 'After-Hours Availability',
  social_dm: 'Social DM',
};

export function PillarDetailCard({ data }: { data: PillarDetailData }) {
  const color = scoreColor(data.score);

  const containerStyle: CSSProperties = {
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '16px',
    background: 'hsl(var(--card))',
    borderLeft: `3px solid ${color}`,
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
            {PILLAR_LABELS[data.pillar] || data.pillar}
          </div>
          <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
            {data.domain}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color }}>{data.score}</span>
          <span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>/100</span>
          <div style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>
            Grade: {gradeLabel(data.grade)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {data.signals.map((s) => (
          <div key={s.signal} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', color: 'hsl(var(--foreground))', display: 'flex', justifyContent: 'space-between' }}>
                <span>{SIGNAL_LABELS[s.signal] || s.signal}</span>
                <span style={{ color: scoreColor(s.score), fontWeight: 600 }}>{s.score}</span>
              </div>
              <div style={{ height: '4px', background: 'hsl(var(--muted))', borderRadius: '2px', marginTop: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(s.score, 100)}%`, background: scoreColor(s.score), borderRadius: '2px', transition: 'width 0.3s' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gap Recommendation Card
// ---------------------------------------------------------------------------

export interface GapRecommendationData {
  domain: string;
  signal: string;
  currentScore: number;
  severity: string;
  pillar: string;
  offering?: string;
  impact?: string;
}

export function GapRecommendationCard({ data }: { data: GapRecommendationData }) {
  const sevColor = SEVERITY_COLORS[data.severity] || SEVERITY_COLORS.info;

  const containerStyle: CSSProperties = {
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
    padding: '12px 16px',
    background: 'hsl(var(--card))',
    borderLeft: `3px solid ${sevColor}`,
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '10px',
    fontWeight: 600,
    borderRadius: '3px',
    color: '#fff',
    background: sevColor,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={badgeStyle}>{data.severity}</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'hsl(var(--foreground))' }}>
          {SIGNAL_LABELS[data.signal] || data.signal}
        </span>
        <span style={{ fontSize: '11px', color: scoreColor(data.currentScore), fontWeight: 600, marginLeft: 'auto' }}>
          {data.currentScore}/100
        </span>
      </div>
      {data.impact && (
        <div style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', lineHeight: 1.4, marginBottom: '4px' }}>
          {data.impact}
        </div>
      )}
      {data.offering && (
        <div style={{ fontSize: '11px', color: 'hsl(var(--primary))', fontWeight: 500 }}>
          Recommended: {data.offering}
        </div>
      )}
      <div style={{ fontSize: '10px', color: 'hsl(var(--muted-foreground))', marginTop: '4px' }}>
        {PILLAR_LABELS[data.pillar] || data.pillar} · {data.domain}
      </div>
    </div>
  );
}
