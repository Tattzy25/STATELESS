import { analyzePrompt } from './analyzePrompt';
import { getMultiPageSitePrompt, getGenerationPrompt } from './prompts';
import { callV0Dev, callAIGateway } from './callAIs';
import { TIER_CONFIGS, TierType } from './config';

export interface OrchestrationOptions {
  tier?: TierType;
  apiKeys?: {
    v0?: string;
    aiGateway?: string;
  };
}

export async function orchestrate(prompt: string, options: OrchestrationOptions = {}) {
  const { tier = 'basic', apiKeys } = options;
  const tierConfig = TIER_CONFIGS[tier];

  // 1. Analyze
  const analysis = analyzePrompt(prompt);

  // 2. Plan (assign sections/tasks)
  let v0Task, aiGatewayTask;
  if (analysis.type === 'site') {
    v0Task = getMultiPageSitePrompt(analysis.library) + '\n' + prompt;
    aiGatewayTask = getMultiPageSitePrompt(analysis.library) + '\n' + prompt;
  } else {
    v0Task = getGenerationPrompt(analysis.library) + '\n' + prompt;
    aiGatewayTask = getGenerationPrompt(analysis.library) + '\n' + prompt;
  }

  // 3. Call AIs in parallel with tier-specific models
  const [v0Result, aiGatewayResult] = await Promise.all([
    callV0Dev(
      v0Task,
      undefined, // system prompt
      tierConfig.v0Model,
      apiKeys?.v0
    ),
    callAIGateway(
      aiGatewayTask,
      undefined, // system prompt
      tierConfig.aiGatewayModel,
      apiKeys?.aiGateway
    ),
  ]);

  // 4. Merge results with tier information
  const finalResult = `${v0Result}\n\n// === AI SEPARATOR ===\n\n${aiGatewayResult}`;

  return {
    result: finalResult,
    analysis,
    tier,
    estimatedCost: tierConfig.estimatedCost,
    tierDescription: tierConfig.description
  };
}