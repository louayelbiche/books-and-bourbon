/**
 * Card Type Interfaces — Per-Agent
 *
 * Type-safe card interfaces for all 14 agent card types.
 * Each interface extends ValidatedCard with typed `data` fields.
 */

// Campaign Agent
export type {
  BrandProfileCard,
  BrandProfileCardData,
  RecipientTableCard,
  RecipientTableCardData,
  EmailPreviewCard,
  EmailPreviewCardData,
  CampaignSummaryCard,
  CampaignSummaryCardData,
} from './campaign.js';

// Engagement Agent
export type {
  PersonaCard,
  PersonaCardData,
  SubjectLineCard,
  SubjectLineCardData,
  NewsletterPreviewCard,
  NewsletterPreviewCardData,
  SectionCard,
  SectionCardData,
  NewsletterSummaryCard,
  NewsletterSummaryCardData,
} from './engagement.js';

// Social Agent
export type {
  BrandAnalysisCard,
  BrandAnalysisCardData,
  SocialPostCard,
  SocialPostCardData,
  LinkedInPreviewCard,
  LinkedInPreviewCardData,
  WeekOverviewCard,
  WeekOverviewCardData,
} from './social.js';

// Pidgie Dashboard
export type {
  BusinessBreakdownCard,
  BusinessBreakdownCardData,
} from './pidgie.js';

// Marketing Agent
export type {
  PainPointCard,
  PainPointCardData,
  AdBriefCard,
  AdBriefCardData,
  AdScriptCard,
  AdScriptCardData,
  AdImageCard,
  AdImageCardData,
  CompetitorPatternCard,
  CompetitorPatternCardData,
  AbTestPlanCard,
  AbTestPlanCardData,
  AdCampaignSummaryCard,
  AdCampaignSummaryCardData,
  ImageBatchCard,
  ImageBatchCardData,
} from './marketing.js';

/**
 * Union of all typed card interfaces.
 */
import type { BrandProfileCard } from './campaign.js';
import type { RecipientTableCard } from './campaign.js';
import type { EmailPreviewCard } from './campaign.js';
import type { CampaignSummaryCard } from './campaign.js';
import type { PersonaCard } from './engagement.js';
import type { SubjectLineCard } from './engagement.js';
import type { NewsletterPreviewCard } from './engagement.js';
import type { SectionCard } from './engagement.js';
import type { NewsletterSummaryCard } from './engagement.js';
import type { BrandAnalysisCard } from './social.js';
import type { SocialPostCard } from './social.js';
import type { LinkedInPreviewCard } from './social.js';
import type { WeekOverviewCard } from './social.js';
import type { BusinessBreakdownCard } from './pidgie.js';
import type { PainPointCard } from './marketing.js';
import type { AdBriefCard } from './marketing.js';
import type { AdScriptCard } from './marketing.js';
import type { AdImageCard } from './marketing.js';
import type { CompetitorPatternCard } from './marketing.js';
import type { AbTestPlanCard } from './marketing.js';
import type { AdCampaignSummaryCard } from './marketing.js';
import type { ImageBatchCard } from './marketing.js';

export type TypedValidatedCard =
  | BrandProfileCard
  | RecipientTableCard
  | EmailPreviewCard
  | CampaignSummaryCard
  | PersonaCard
  | SubjectLineCard
  | NewsletterPreviewCard
  | SectionCard
  | NewsletterSummaryCard
  | BrandAnalysisCard
  | SocialPostCard
  | LinkedInPreviewCard
  | WeekOverviewCard
  | BusinessBreakdownCard
  | PainPointCard
  | AdBriefCard
  | AdScriptCard
  | AdImageCard
  | CompetitorPatternCard
  | AbTestPlanCard
  | AdCampaignSummaryCard
  | ImageBatchCard;
