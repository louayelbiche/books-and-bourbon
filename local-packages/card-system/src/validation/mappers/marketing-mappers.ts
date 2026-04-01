/**
 * Marketing Agent Card Mappers
 *
 * Maps in-memory agent state records to validated Marketing card types.
 * Unlike other agents, marketing cards are primarily emitted directly
 * from agent state rather than queried from DB, but mappers provide
 * consistent structure for the validation pipeline.
 */

import { registerCardMapper } from '../build-card.js';

interface PainPointRecord {
  id: string;
  category: string;
  verbatim_language: string[];
  verbatim_quotes: Array<{ text: string; url: string; subreddit: string }>;
  engagement_score: number;
  product_fit: { primary: string; secondary: string | null };
  ad_angles: string[];
  relevance_score: number;
}

interface AdBriefRecord {
  id: string;
  platform: string;
  pain_point_ref: string;
  product: string;
  format: string;
  duration: string;
  hook: { type: string; text: string; visual: string };
  problem: { visualization: string };
  solution: { key_benefit: string; proof_point: string };
  cta: { action: string; urgency: string };
  ab_test_plan: unknown | null;
}

interface AdScriptRecord {
  id: string;
  brief_ref: string;
  platform: string;
  total_duration: string;
  scenes: Array<{
    scene_number: number;
    duration: string;
    visual: string;
    voiceover: string;
    on_screen_text: string;
  }>;
  talent_notes: string;
  music_direction: string;
}

interface AdImageRecord {
  id: string;
  image_url: string;
  prompt_used: string;
  dimensions: string;
  platform: string;
  qa_score: number;
  qa_breakdown: {
    composition: number;
    brand_consistency: number;
    technical_quality: number;
    text_accuracy: number;
    mood_alignment: number;
  };
}

interface CompetitorPatternRecord {
  source: string;
  patterns: Array<{
    hook_type: string;
    hook_example: string;
    format: string;
    engagement_signal: string;
  }>;
  trending_hooks: string[];
  trending_formats: string[];
}

interface AdCampaignSummaryRecord {
  brand_name: string;
  pain_points_found: number;
  briefs_generated: number;
  scripts_generated: number;
  images_generated: number;
  executive_summary: string;
  top_pain_points: string[];
  top_hooks: string[];
  recommendations: string[];
  cost_breakdown: { total: number };
}

export function registerMarketingCardMappers(): void {
  registerCardMapper<PainPointRecord>('pain-point', (record, tenantId) => ({
    type: 'pain-point',
    id: record.id,
    data: {
      id: record.id,
      category: record.category,
      verbatimLanguage: record.verbatim_language,
      verbatimQuotes: record.verbatim_quotes,
      engagementScore: record.engagement_score,
      productFit: record.product_fit.primary,
      adAngles: record.ad_angles,
      relevanceScore: record.relevance_score,
    },
    source: {
      table: 'MarketingAgentState',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<AdBriefRecord>('ad-brief', (record, tenantId) => ({
    type: 'ad-brief',
    id: record.id,
    data: {
      id: record.id,
      platform: record.platform,
      painPointRef: record.pain_point_ref,
      product: record.product,
      format: record.format,
      duration: record.duration,
      hookType: record.hook.type,
      hookText: record.hook.text,
      hookVisual: record.hook.visual,
      problemVisualization: record.problem.visualization,
      solutionBenefit: record.solution.key_benefit,
      solutionProofPoint: record.solution.proof_point,
      ctaAction: record.cta.action,
      ctaUrgency: record.cta.urgency,
      hasAbTest: record.ab_test_plan !== null,
    },
    source: {
      table: 'MarketingAgentState',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<AdScriptRecord>('ad-script', (record, tenantId) => ({
    type: 'ad-script',
    id: record.id,
    data: {
      id: record.id,
      briefRef: record.brief_ref,
      platform: record.platform,
      totalDuration: record.total_duration,
      sceneCount: record.scenes.length,
      scenes: record.scenes.map((s) => ({
        sceneNumber: s.scene_number,
        duration: s.duration,
        visual: s.visual,
        voiceover: s.voiceover,
        onScreenText: s.on_screen_text,
      })),
      talentNotes: record.talent_notes,
      musicDirection: record.music_direction,
    },
    source: {
      table: 'MarketingAgentState',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<AdImageRecord>('ad-image', (record, tenantId) => ({
    type: 'ad-image',
    id: record.id,
    data: {
      id: record.id,
      imageUrl: record.image_url,
      promptUsed: record.prompt_used,
      dimensions: record.dimensions,
      platform: record.platform,
      qaScore: record.qa_score,
      qaBreakdown: {
        composition: record.qa_breakdown.composition,
        brandConsistency: record.qa_breakdown.brand_consistency,
        technicalQuality: record.qa_breakdown.technical_quality,
        textAccuracy: record.qa_breakdown.text_accuracy,
        moodAlignment: record.qa_breakdown.mood_alignment,
      },
    },
    source: {
      table: 'MarketingAgentState',
      recordId: record.id,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<CompetitorPatternRecord>('competitor-pattern', (record, tenantId) => ({
    type: 'competitor-pattern',
    id: `cp-${record.source}-${Date.now()}`,
    data: {
      source: record.source,
      patterns: record.patterns.map((p) => ({
        hookType: p.hook_type,
        hookExample: p.hook_example,
        format: p.format,
        engagementSignal: p.engagement_signal,
      })),
      trendingHooks: record.trending_hooks,
      trendingFormats: record.trending_formats,
    },
    source: {
      table: 'MarketingAgentState',
      recordId: `cp-${record.source}`,
      tenantId,
      validatedAt: Date.now(),
    },
  }));

  registerCardMapper<AdCampaignSummaryRecord>('ad-campaign-summary', (record, tenantId) => ({
    type: 'ad-campaign-summary',
    id: `acs-${tenantId}-${Date.now()}`,
    data: {
      brandName: record.brand_name,
      painPointsFound: record.pain_points_found,
      briefsGenerated: record.briefs_generated,
      scriptsGenerated: record.scripts_generated,
      imagesGenerated: record.images_generated,
      executiveSummary: record.executive_summary,
      topPainPoints: record.top_pain_points,
      topHooks: record.top_hooks,
      recommendations: record.recommendations,
      totalCost: record.cost_breakdown.total,
    },
    source: {
      table: 'MarketingAgentState',
      recordId: `acs-${tenantId}`,
      tenantId,
      validatedAt: Date.now(),
    },
  }));
}
