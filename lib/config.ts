// V0.dev Configuration
export const V0_API_KEY = process.env.V0_API_KEY || "";
export const V0_MODEL = process.env.V0_MODEL || "v0-1.5-md";

// AI Gateway Configuration
export const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || "";
export const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL || "https://gateway.ai.cloudflare.com/v1";

// AI Gateway Models - Easy switching
export const AI_GATEWAY_MODELS = {
  // Anthropic Claude models
  CLAUDE_3_5_SONNET: "anthropic/claude-3-5-sonnet-20241022",
  CLAUDE_3_HAIKU: "anthropic/claude-3-haiku-20240307",
  CLAUDE_3_OPUS: "anthropic/claude-3-opus-20240229",
  CLAUDE_4_SONNET: "anthropic/claude-4-sonnet",
  CLAUDE_4_OPUS: "anthropic/claude-4-opus",
  
  // OpenAI models for premium tiers
  OPENAI_GPT4_TURBO: "openai/gpt-4-turbo-preview",
  OPENAI_GPT4O: "openai/gpt-4o",
  
  // Perplexity models
  PERPLEXITY_SONAR_PRO: "perplexity/sonar-pro",
} as const;

// Tier-based model configuration
export const TIER_CONFIGS = {
  basic: {
    v0Model: V0_MODEL,
    aiGatewayModel: AI_GATEWAY_MODELS.CLAUDE_3_5_SONNET,
    estimatedCost: 0.05, // $0.05 per completion
    description: "Standard dual AI orchestration"
  },
  premium: {
    v0Model: V0_MODEL, // Keep V0 consistent
    aiGatewayModel: AI_GATEWAY_MODELS.CLAUDE_4_SONNET,
    estimatedCost: 25.0, // ~$25 per completion
    description: "Enhanced AI with Claude 4 Sonnet"
  },
  enterprise: {
    v0Model: V0_MODEL, // Keep V0 consistent
    aiGatewayModel: AI_GATEWAY_MODELS.CLAUDE_4_OPUS,
    estimatedCost: 50.0, // ~$50 per completion
    description: "Maximum capability with Claude 4 Opus"
  }
} as const;

export type TierType = keyof typeof TIER_CONFIGS;

// Current selected model for AI Gateway (default to basic tier)
export const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || TIER_CONFIGS.basic.aiGatewayModel;