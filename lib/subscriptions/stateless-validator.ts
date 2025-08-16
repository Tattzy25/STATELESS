import { z } from 'zod';
import { SubscriptionTier, SUBSCRIPTION_CONFIGS } from './index';

// User context from headers
export interface UserContext {
  userId: string;
  tier: SubscriptionTier;
  creditsRemaining: number;
  completionsRemaining: number;
  completionsUsed: number;
  projectsCreated: number;
  hasDualAccess: boolean;
  apiKeys?: {
    v0ApiKey?: string;
    claudeApiKey?: string;
  };
}

// Validation result
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  canProceed: boolean;
  creditsRequired: number;
  userContext: UserContext;
}

// Headers schema for validation
export const userContextHeadersSchema = z.object({
  'x-user-id': z.string().min(1, 'User ID is required'),
  'x-user-tier': z.enum(['free', 'pro', 'byok']),
  'x-user-credits': z.string().transform(val => parseFloat(val)),
  'x-user-completions': z.string().transform(val => parseInt(val)),
  'x-user-completions-used': z.string().transform(val => parseInt(val)),
  'x-user-projects': z.string().transform(val => parseInt(val)),
  'x-has-dual-access': z.string().transform(val => val === 'true'),
  'x-v0-api-key': z.string().optional(),
  'x-claude-api-key': z.string().optional(),
});

/**
 * Stateless subscription validator
 * Validates user context from request headers without maintaining state
 */
export class StatelessSubscriptionValidator {
  /**
   * Parse and validate user context from headers
   */
  static parseUserContext(headers: Record<string, string | string[] | undefined>): UserContext {
    const parsed = userContextHeadersSchema.parse({
      'x-user-id': headers['x-user-id'],
      'x-user-tier': headers['x-user-tier'],
      'x-user-credits': headers['x-user-credits'],
      'x-user-completions': headers['x-user-completions'],
      'x-user-completions-used': headers['x-user-completions-used'],
      'x-user-projects': headers['x-user-projects'],
      'x-has-dual-access': headers['x-has-dual-access'],
      'x-v0-api-key': headers['x-v0-api-key'],
      'x-claude-api-key': headers['x-claude-api-key'],
    });

    const tierConfig = SUBSCRIPTION_CONFIGS[parsed['x-user-tier'] as SubscriptionTier];
    const completionsRemaining = tierConfig.monthlyCompletions === -1 
      ? Infinity 
      : Math.max(0, tierConfig.monthlyCompletions - parsed['x-user-completions-used']);

    return {
      userId: parsed['x-user-id'],
      tier: parsed['x-user-tier'] as SubscriptionTier,
      creditsRemaining: parsed['x-user-credits'],
      completionsRemaining,
      completionsUsed: parsed['x-user-completions-used'],
      projectsCreated: parsed['x-user-projects'],
      hasDualAccess: parsed['x-has-dual-access'],
      apiKeys: {
        v0ApiKey: parsed['x-v0-api-key'],
        claudeApiKey: parsed['x-claude-api-key'],
      }
    };
  }

  /**
   * Validate if user can perform an action
   */
  static validateAction(
    userContext: UserContext, 
    action: 'single-ai' | 'dual-ai' | 'create-project'
  ): ValidationResult {
    const creditsRequired = action === 'dual-ai' ? 2 : 1;
    const hasCredits = userContext.creditsRemaining >= creditsRequired;
    const hasCompletions = userContext.completionsRemaining > 0;
    const tierConfig = SUBSCRIPTION_CONFIGS[userContext.tier];

    // Check basic usage limits
    if (!hasCredits && !hasCompletions) {
      return {
        isValid: false,
        canProceed: false,
        creditsRequired,
        userContext,
        error: `❌ Usage limit reached. Current tier: ${userContext.tier}\n\n💡 Upgrade to Pro ($20/month) for 300 completions + $20 credits\n💡 Or purchase credits: $3 (50 completions), $5 (150 completions), $7 (300 completions), $10 (500 completions)\n\n🔥 Any purchase unlocks Dual AI Builder!`
      };
    }

    // Check dual AI access
    if (action === 'dual-ai' && !userContext.hasDualAccess) {
      return {
        isValid: false,
        canProceed: false,
        creditsRequired,
        userContext,
        error: `🔒 Dual AI Builder is a premium feature!\n\n🔥 Unlock with any purchase:\n💡 Pro subscription ($20/month): 300 completions + $20 credits\n💡 Credit top-ups: $3 (50 completions), $5 (150 completions), $7 (300 completions), $10 (500 completions)\n\n✨ Dual AI combines Claude Sonnet 4 (backend logic) + V0.dev (frontend design) for complete solutions!`
      };
    }

    // Check project limits
    if (action === 'create-project') {
      const projectLimit = tierConfig.projectLimit;
      if (projectLimit !== -1 && userContext.projectsCreated >= projectLimit) {
        return {
          isValid: false,
          canProceed: false,
          creditsRequired: 0,
          userContext,
          error: `❌ Project limit reached (${userContext.projectsCreated}/${projectLimit}). Upgrade to Pro for unlimited projects.`
        };
      }
    }

    return {
      isValid: true,
      canProceed: true,
      creditsRequired,
      userContext
    };
  }

  /**
   * Calculate usage after an action
   */
  static calculateUsage(
    userContext: UserContext,
    action: 'single-ai' | 'dual-ai' | 'create-project'
  ): {
    creditsUsed: number;
    completionsUsed: number;
    newCreditsRemaining: number;
    newCompletionsUsed: number;
    newProjectsCreated: number;
  } {
    const creditsRequired = action === 'dual-ai' ? 2 : (action === 'single-ai' ? 1 : 0);
    const hasCompletions = userContext.completionsRemaining > 0;
    
    let creditsUsed = 0;
    let completionsUsed = 0;
    let newProjectsCreated = userContext.projectsCreated;

    if (action === 'create-project') {
      newProjectsCreated += 1;
    }

    if (action === 'single-ai' || action === 'dual-ai') {
      if (hasCompletions) {
        // Use completion first
        completionsUsed = 1;
      } else {
        // Use credits
        creditsUsed = creditsRequired;
      }
    }

    return {
      creditsUsed,
      completionsUsed,
      newCreditsRemaining: userContext.creditsRemaining - creditsUsed,
      newCompletionsUsed: userContext.completionsUsed + completionsUsed,
      newProjectsCreated
    };
  }

  /**
   * Get API keys to use (BYOK or server keys)
   */
  static getApiKeys(userContext: UserContext): {
    v0ApiKey?: string;
    claudeApiKey?: string;
  } {
    if (userContext.tier === SubscriptionTier.MCP_PRO_BYOK) {
      return {
        v0ApiKey: userContext.apiKeys?.v0ApiKey,
        claudeApiKey: userContext.apiKeys?.claudeApiKey
      };
    }
    return {};
  }

  /**
   * Generate usage summary for response
   */
  static generateUsageSummary(
    userContext: UserContext,
    usage: ReturnType<typeof StatelessSubscriptionValidator.calculateUsage>
  ): string {
    const tierConfig = SUBSCRIPTION_CONFIGS[userContext.tier];
    const completionsRemaining = tierConfig.monthlyCompletions === -1 
      ? '∞' 
      : (tierConfig.monthlyCompletions - usage.newCompletionsUsed).toString();

    return `📊 Usage: ${usage.newCompletionsUsed} completions used, ${completionsRemaining} remaining, $${usage.newCreditsRemaining} credits remaining`;
  }
}

/**
 * Middleware function for Next.js API routes
 */
export function validateUserContext(headers: Record<string, string | string[] | undefined>) {
  try {
    return StatelessSubscriptionValidator.parseUserContext(headers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid user context headers: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}