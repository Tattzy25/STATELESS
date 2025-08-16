import { z } from 'zod';

// Subscription tier definitions
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  PRO_BYOK = 'pro_byok'
}

// User subscription schema
export const UserSubscriptionSchema = z.object({
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier),
  creditsRemaining: z.number().default(0),
  completionsUsed: z.number().default(0),
  projectsCreated: z.number().default(0),
  hasDualAI: z.boolean().default(false),
  subscriptionStart: z.date().optional(),
  subscriptionEnd: z.date().optional(),
  lastActivity: z.date().optional(),
  apiKeys: z.object({
    v0ApiKey: z.string().optional(),
    claudeApiKey: z.string().optional()
  }).optional()
});

export type UserSubscription = z.infer<typeof UserSubscriptionSchema>;

// Subscription management schema for MCP
export const subscriptionSchema = z.object({
  action: z.enum(['get-status', 'purchase-credits', 'upgrade-tier', 'setup-byok']),
  userId: z.string(),
  tier: z.nativeEnum(SubscriptionTier).optional(),
  packageKey: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  apiKeys: z.object({
    v0ApiKey: z.string().optional(),
    claudeApiKey: z.string().optional()
  }).optional()
});

// Project management schema
export const projectSchema = z.object({
  action: z.enum(['create', 'get-usage', 'list']),
  userId: z.string(),
  projectName: z.string().optional(),
  projectType: z.enum(['component', 'page', 'app', 'api']).optional()
});