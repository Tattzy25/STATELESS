import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { callV0Dev, callAIGateway } from '../../lib/callAIs';
import { orchestrate, OrchestrationOptions } from '../../lib/orchestrator';
import { StatelessSubscriptionValidator, UserContext } from '../../lib/subscriptions/stateless-validator';
import { SubscriptionTier } from '../../lib/subscriptions/schemas';
import { withValidation, withCors } from '../../lib/middleware/validation';
import { TierType, TIER_CONFIGS } from '../../lib/config';

// Request body schema
const requestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  provider: z.enum(['v0', 'gateway', 'dual']).default('dual'),
  tier: z.enum(['basic', 'premium', 'enterprise']).default('basic'),
  v0Model: z.string().optional(),
  gatewayModel: z.string().optional(),
});

// Note: Headers validation is now handled by StatelessSubscriptionValidator

// Response format
interface AICompletionResponse {
  success: boolean;
  data?: {
    result: string;
    provider: string;
    tier: TierType;
    estimatedCost: number;
    tierDescription: string;
    usage: {
      creditsUsed: number;
      completionsUsed: number;
      creditsRemaining: number;
      completionsRemaining: number;
    };
  };
  error?: string;
}

// Main handler function using middleware
async function aiCompletionHandler(req: NextApiRequest, res: NextApiResponse, userContext: UserContext) {
  // Handle CORS
  if (withCors(req, res)) {
    return;
  }

  // Validate request body
  const body = requestSchema.parse(req.body);
  
  // Validate tier access based on user subscription
  const requestedTier = body.tier as TierType;
  const tierConfig = TIER_CONFIGS[requestedTier];
  
  // Check if user can access the requested tier
  if (requestedTier === 'premium' && userContext.tier === SubscriptionTier.MCP_FREE) {
    return res.status(403).json({
      success: false,
      error: 'Premium tier requires a paid subscription'
    });
  }
  
  if (requestedTier === 'enterprise' && ![SubscriptionTier.MCP_PRO, SubscriptionTier.MCP_PRO_BYOK].includes(userContext.tier)) {
    return res.status(403).json({
      success: false,
      error: 'Enterprise tier requires a pro or enterprise subscription'
    });
  }

  // Validate the requested action
  const action = body.provider === 'dual' ? 'dual-ai' : 'single-ai';
  const validation = StatelessSubscriptionValidator.validateAction(userContext, action);
  
  if (!validation.canProceed) {
    const statusCode = validation.error?.includes('premium feature') ? 403 : 402;
    return res.status(statusCode).json({
      success: false,
      error: validation.error
    });
  }

  // Get API keys to use (BYOK or server keys)
  const apiKeys = StatelessSubscriptionValidator.getApiKeys(userContext);

  let result: string;
  let tier: TierType;
  let estimatedCost: number;
  let tierDescription: string;

  // Execute AI calls based on provider
  if (body.provider === 'v0') {
    result = await callV0Dev(
      body.prompt, 
      body.systemPrompt,
      body.v0Model || tierConfig.v0Model, 
      apiKeys.v0ApiKey
    );
    tier = requestedTier;
    estimatedCost = tierConfig.estimatedCost * 0.5; // V0 only, so half cost
    tierDescription = `V0 only - ${tierConfig.description}`;
  } else if (body.provider === 'gateway') {
    result = await callAIGateway(
      body.prompt, 
      body.systemPrompt,
      body.gatewayModel || tierConfig.aiGatewayModel, 
      apiKeys.claudeApiKey
    );
    tier = requestedTier;
    estimatedCost = tierConfig.estimatedCost * 0.5; // Gateway only, so half cost
    tierDescription = `AI Gateway only - ${tierConfig.description}`;
  } else if (body.provider === 'dual') {
    const orchestrationOptions: OrchestrationOptions = {
      tier: requestedTier,
      apiKeys: {
        v0: apiKeys.v0ApiKey,
        aiGateway: apiKeys.claudeApiKey
      }
    };
    
    const orchestrationResult = await orchestrate(body.prompt, orchestrationOptions);
    result = orchestrationResult.result;
    tier = orchestrationResult.tier;
    estimatedCost = orchestrationResult.estimatedCost;
    tierDescription = orchestrationResult.tierDescription;
  } else {
    return res.status(400).json({
      success: false,
      error: 'Invalid provider. Must be "v0", "gateway", or "dual"'
    });
  }

  // Calculate usage after successful completion
  const updatedUsage = StatelessSubscriptionValidator.calculateUsage(userContext, action);

  // Return success response with AI result and updated usage
  return res.status(200).json({
    success: true,
    data: {
      result,
      provider: body.provider,
      tier,
      estimatedCost,
      tierDescription,
      usage: {
          creditsUsed: updatedUsage.creditsUsed,
          completionsUsed: updatedUsage.completionsUsed,
          creditsRemaining: updatedUsage.newCreditsRemaining,
          completionsRemaining: userContext.completionsRemaining - updatedUsage.completionsUsed
        }
    }
  });
}

// Export the handler wrapped with validation middleware
export default withValidation(aiCompletionHandler);