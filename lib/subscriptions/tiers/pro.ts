import { SubscriptionTier } from '../schemas';

export const PRO_TIER_CONFIG = {
  tier: SubscriptionTier.MCP_PRO,
  price: 20,
  monthlyCredits: 20, // $20 usage credit
  projectLimit: -1, // Unlimited
  monthlyCompletions: 300,
  hasDualAI: true,
  requiresOwnKeys: false,
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

export default PRO_TIER_CONFIG;