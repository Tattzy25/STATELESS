import { SubscriptionTier } from '../schemas';

export const PRO_BYOK_TIER_CONFIG = {
  tier: SubscriptionTier.PRO_BYOK,
  price: 10, // 50% discount
  monthlyCredits: 20, // Same credits as Pro
  projectLimit: -1, // Unlimited
  monthlyCompletions: 300,
  hasDualAI: true,
  requiresOwnKeys: true,
  features: [
    'MCP Connect',
    '300 Chat Completions',
    'Legendary Website Builder',
    '$20 usage credit per month',
    'Unlimited projects',
    'One click deploy to Vercel',
    'Purchase additional credits outside monthly limits',
    'Access to v0-1.5-md and 100+ models via Gateway',
    '✨ Dual AI Builder included (Claude Sonnet 4 + v0.dev parallel processing)'
  ]
};

export default PRO_BYOK_TIER_CONFIG;