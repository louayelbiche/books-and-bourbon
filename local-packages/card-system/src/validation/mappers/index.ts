import { registerCampaignCardMappers } from './campaign-mappers.js';
import { registerEngagementCardMappers } from './engagement-mappers.js';
import { registerSocialCardMappers } from './social-mappers.js';
import { registerBusinessBreakdownMapper } from './pidgie-mappers.js';
import { registerAdvisorCardMappers } from './advisor-mappers.js';
import { registerMarketingCardMappers } from './marketing-mappers.js';
import { registerReputationCardMappers } from './reputation-mappers.js';

export { registerCampaignCardMappers } from './campaign-mappers.js';
export { registerEngagementCardMappers } from './engagement-mappers.js';
export { registerSocialCardMappers } from './social-mappers.js';
export { registerBusinessBreakdownMapper } from './pidgie-mappers.js';
export { registerAdvisorCardMappers } from './advisor-mappers.js';
export { registerMarketingCardMappers } from './marketing-mappers.js';
export { registerReputationCardMappers } from './reputation-mappers.js';

/**
 * Register all agent card mappers at once.
 * Call this once at app startup.
 */
export function registerAllAgentCardMappers(): void {
  registerCampaignCardMappers();
  registerEngagementCardMappers();
  registerSocialCardMappers();
  registerBusinessBreakdownMapper();
  registerAdvisorCardMappers();
  registerMarketingCardMappers();
  registerReputationCardMappers();
}
