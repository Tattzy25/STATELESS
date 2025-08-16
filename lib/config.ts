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
  
  // Add more providers as needed
  // OPENAI_GPT4: "openai/gpt-4-turbo-preview",
  // OPENAI_GPT35: "openai/gpt-3.5-turbo",
} as const;

// Current selected model for AI Gateway
export const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || AI_GATEWAY_MODELS.CLAUDE_3_5_SONNET;

// Legacy Gateway5 exports for backward compatibility
export const GATEWAY5_API_KEY = AI_GATEWAY_API_KEY;
export const GATEWAY5_MODEL = AI_GATEWAY_MODEL;