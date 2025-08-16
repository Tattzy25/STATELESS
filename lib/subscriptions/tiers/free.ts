import { SubscriptionTier } from '../schemas';

export const FREE_TIER_CONFIG = {
  tier: SubscriptionTier.MCP_FREE,
  price: 0,
  monthlyCredits: 5, // $5 usage credit per month
  projectLimit: 200,
  monthlyCompletions: 0, // No chat completions included
  hasDualAI: false, // Single AI only
  requiresOwnKeys: false,
  features: [
    'MCP Connect',
    'Website Builder',
    '$5 usage credit per month',
    'Deploy to Vercel',
    'Sync with GitHub',
    'Create up to 200 projects',
    'Access to 1 AI Builder',
    'Purchase additional credits outside monthly limits',
    '🔥 Any top-up unlocks Dual AI Builder for parallel processing'
  ]
};

export default FREE_TIER_CONFIG;