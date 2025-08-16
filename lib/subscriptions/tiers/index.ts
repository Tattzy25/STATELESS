import { SubscriptionTier } from '../schemas';
import FREE_TIER_CONFIG from './free';
import PRO_TIER_CONFIG from './pro';
import PRO_BYOK_TIER_CONFIG from './byok';

// Consolidated MCP subscription tier configurations
export const SUBSCRIPTION_CONFIGS = {
  [SubscriptionTier.MCP_FREE]: FREE_TIER_CONFIG,
  [SubscriptionTier.MCP_PRO]: PRO_TIER_CONFIG,
  [SubscriptionTier.MCP_PRO_BYOK]: PRO_BYOK_TIER_CONFIG
};

// Export individual configs
export { FREE_TIER_CONFIG, PRO_TIER_CONFIG, PRO_BYOK_TIER_CONFIG };

// Export tier enum for convenience
export { SubscriptionTier } from '../schemas';