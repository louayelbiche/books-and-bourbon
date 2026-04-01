/**
 * Marketing Agent Card Types
 *
 * Card interfaces for the Marketing (Ad Creative) agent.
 * All cards are emitted from in-memory agent state, not DB records.
 */

import type { ValidatedCard } from '../types.js';

/**
 * Pain point card -- shows a discovered customer pain point with source quotes.
 */
export interface PainPointCardData extends Record<string, unknown> {
  id: string;
  category: string;
  verbatimLanguage: string[];
  verbatimQuotes: Array<{ text: string; url: string; subreddit: string }>;
  engagementScore: number;
  productFit: string;
  adAngles: string[];
  relevanceScore: number;
}

export interface PainPointCard extends ValidatedCard {
  type: 'pain-point';
  data: PainPointCardData;
}

/**
 * Ad brief card -- shows a generated ad brief with hook, problem, solution, CTA.
 */
export interface AdBriefCardData extends Record<string, unknown> {
  id: string;
  platform: string;
  painPointRef: string;
  product: string;
  format: string;
  duration: string;
  hookType: string;
  hookText: string;
  hookVisual: string;
  problemVisualization: string;
  solutionBenefit: string;
  solutionProofPoint: string;
  ctaAction: string;
  ctaUrgency: string;
  hasAbTest: boolean;
}

export interface AdBriefCard extends ValidatedCard {
  type: 'ad-brief';
  data: AdBriefCardData;
}

/**
 * Ad script card -- shows a production-ready ad script with scenes.
 */
export interface AdScriptCardData extends Record<string, unknown> {
  id: string;
  briefRef: string;
  platform: string;
  totalDuration: string;
  sceneCount: number;
  scenes: Array<{
    sceneNumber: number;
    duration: string;
    visual: string;
    voiceover: string;
    onScreenText: string;
  }>;
  talentNotes: string;
  musicDirection: string;
}

export interface AdScriptCard extends ValidatedCard {
  type: 'ad-script';
  data: AdScriptCardData;
}

/**
 * Ad image card -- shows a generated ad image with QA score.
 */
export interface AdImageCardData extends Record<string, unknown> {
  id: string;
  imageUrl: string;
  promptUsed: string;
  dimensions: string;
  platform: string;
  qaScore: number;
  qaBreakdown: {
    composition: number;
    brandConsistency: number;
    technicalQuality: number;
    textAccuracy: number;
    moodAlignment: number;
  };
}

export interface AdImageCard extends ValidatedCard {
  type: 'ad-image';
  data: AdImageCardData;
}

/**
 * Competitor pattern card -- shows discovered competitor ad patterns.
 */
export interface CompetitorPatternCardData extends Record<string, unknown> {
  source: string;
  patterns: Array<{
    hookType: string;
    hookExample: string;
    format: string;
    engagementSignal: string;
  }>;
  trendingHooks: string[];
  trendingFormats: string[];
}

export interface CompetitorPatternCard extends ValidatedCard {
  type: 'competitor-pattern';
  data: CompetitorPatternCardData;
}

/**
 * A/B test plan card -- shows hook and CTA variants with hypotheses.
 */
export interface AbTestPlanCardData extends Record<string, unknown> {
  hookVariants: Array<{
    variant: string;
    type: string;
    text: string;
    reasoning: string;
  }>;
  ctaVariants: Array<{
    variant: string;
    action: string;
    urgency: string;
    reasoning: string;
  }>;
  hypothesis: string;
  testMetric: string;
  sampleSize: number;
}

export interface AbTestPlanCard extends ValidatedCard {
  type: 'ab-test-plan';
  data: AbTestPlanCardData;
}

/**
 * Ad campaign summary card -- executive overview of entire ad campaign.
 */
export interface AdCampaignSummaryCardData extends Record<string, unknown> {
  brandName: string;
  painPointsFound: number;
  briefsGenerated: number;
  scriptsGenerated: number;
  imagesGenerated: number;
  executiveSummary: string;
  topPainPoints: string[];
  topHooks: string[];
  recommendations: string[];
  totalCost: number;
}

export interface AdCampaignSummaryCard extends ValidatedCard {
  type: 'ad-campaign-summary';
  data: AdCampaignSummaryCardData;
}

/**
 * Image batch card -- shows results of batch image generation.
 */
export interface ImageBatchCardData extends Record<string, unknown> {
  strategy: string;
  itemsPlanned: number;
  itemsGenerated: number;
  itemsSkipped: number;
  budgetUsed: number;
  images: Array<{
    id: string;
    platform: string;
    dimensions: string;
    qaScore: number;
  }>;
}

export interface ImageBatchCard extends ValidatedCard {
  type: 'image-batch';
  data: ImageBatchCardData;
}
