import { z } from 'zod';
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { callV0Dev, callAIGateway } from '../../../../lib/callAIs';
import { orchestrateAICalls } from '../../../../lib/orchestrator';
import { getAvailableModels } from '../../../../lib/config';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

// Extended auth info with user context
type MyAuthInfo = AuthInfo & {
  user: {
    id: string;
    name: string;
    tier: 'free' | 'pro' | 'enterprise';
  };
};

// Simple API key validation (replace with your auth system)
const validateApiKey = async (apiKey: string): Promise<MyAuthInfo | undefined> => {
  try {
    // Validate API key format (should be a valid UUID or similar)
    if (!apiKey || apiKey.length < 32) {
      return undefined;
    }

    // In production, this would validate against your database/auth service
    // For now, we'll use environment variables for valid API keys
    const validApiKeys = {
      [process.env.MCP_FREE_API_KEY || '']: { id: 'free-user', name: 'Free User', tier: 'free' as const },
      [process.env.MCP_PRO_API_KEY || '']: { id: 'pro-user', name: 'Pro User', tier: 'pro' as const },
      [process.env.MCP_ENTERPRISE_API_KEY || '']: { id: 'enterprise-user', name: 'Enterprise User', tier: 'enterprise' as const },
    };

    const user = validApiKeys[apiKey];
    if (!user) {
      console.warn(`[AUTH] Invalid API key attempted: ${apiKey.substring(0, 8)}...`);
      return undefined;
    }

    console.log(`[AUTH] Valid API key for user: ${user.name} (${user.tier})`);
    return {
      token: apiKey,
      clientId: user.id,
      scopes: ['ai:generate', 'ai:config'],
      user,
    };
  } catch (error) {
    console.error('[AUTH] Error validating API key:', error);
    return undefined;
  }
};

// Rate limiting based on user tier
const checkRateLimit = (user: MyAuthInfo['user']): boolean => {
  // In production, implement proper rate limiting with Redis or similar
  // For now, implement basic tier-based limits
  const rateLimits = {
    free: 10, // 10 requests per hour
    pro: 100, // 100 requests per hour
    enterprise: 1000, // 1000 requests per hour
  };

  // This is a simplified implementation
  // In production, you would track requests per user per time window
  const limit = rateLimits[user.tier];
  
  // For now, always allow but log the limit
  console.log(`[RATE_LIMIT] User ${user.name} has limit of ${limit} requests/hour`);
  return true;
};

// Define input schemas
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
});

const dualGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  v0Model: z.string().optional(),
  gatewayModel: z.string().optional(),
});

// Create the authenticated MCP handler
const handler = createMcpHandler(
  async (server) => {
    // Tool 1: Generate using V0.dev (with user context)
    server.tool(
      'generate-v0',
      'Generate content using V0.dev provider with React/Next.js focus',
      generateSchema,
      async ({ prompt, systemPrompt, model }, { authInfo }) => {
        const user = (authInfo as MyAuthInfo).user;
        
        if (!checkRateLimit(user)) {
          return {
            content: [{
              type: 'text',
              text: 'Rate limit exceeded. Please upgrade your plan or try again later.'
            }]
          };
        }

        try {
          const result = await callV0Dev(prompt, systemPrompt, model);
          return {
            content: [{
              type: 'text',
              text: `V0.dev Response (User: ${user.name}, Tier: ${user.tier}):\n${result}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text', 
              text: `Error calling V0.dev: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );

    // Tool 2: Generate using AI Gateway (with user context)
    server.tool(
      'generate-gateway',
      'Generate content using AI Gateway with Anthropic Claude models',
      generateSchema,
      async ({ prompt, systemPrompt, model }, { authInfo }) => {
        const user = (authInfo as MyAuthInfo).user;
        
        if (!checkRateLimit(user)) {
          return {
            content: [{
              type: 'text',
              text: 'Rate limit exceeded. Please upgrade your plan or try again later.'
            }]
          };
        }

        try {
          const result = await callAIGateway(prompt, systemPrompt, model);
          return {
            content: [{
              type: 'text',
              text: `AI Gateway Response (User: ${user.name}, Tier: ${user.tier}):\n${result}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error calling AI Gateway: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );

    // Tool 3: Dual orchestrated generation (Pro+ only)
    server.tool(
      'generate-dual',
      'Generate content using both V0.dev and AI Gateway in parallel (Pro+ feature)',
      dualGenerateSchema,
      async ({ prompt, systemPrompt, v0Model, gatewayModel }, { authInfo }) => {
        const user = (authInfo as MyAuthInfo).user;
        
        if (user.tier === 'free') {
          return {
            content: [{
              type: 'text',
              text: 'Dual generation is a Pro+ feature. Please upgrade your plan to access this tool.'
            }]
          };
        }

        if (!checkRateLimit(user)) {
          return {
            content: [{
              type: 'text',
              text: 'Rate limit exceeded. Please try again later.'
            }]
          };
        }

        try {
          const result = await orchestrateAICalls(prompt, systemPrompt, v0Model, gatewayModel);
          return {
            content: [{
              type: 'text',
              text: `Dual Generation Result (User: ${user.name}, Tier: ${user.tier}):\nProvider: ${result.provider}\nResponse Time: ${result.responseTime}ms\nContent:\n${result.content}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error in dual generation: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );

    // Tool 4: Get available models and user info
    server.tool(
      'get-config',
      'Get available AI models, configuration, and user information',
      z.object({}),
      async (_, { authInfo }) => {
        const user = (authInfo as MyAuthInfo).user;
        
        try {
          const models = getAvailableModels();
          const userInfo = {
            user: {
              id: user.id,
              name: user.name,
              tier: user.tier,
              features: {
                v0Generation: true,
                gatewayGeneration: true,
                dualGeneration: user.tier !== 'free',
                prioritySupport: user.tier === 'enterprise'
              }
            },
            models
          };
          
          return {
            content: [{
              type: 'text',
              text: `Configuration and User Info:\n${JSON.stringify(userInfo, null, 2)}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error getting configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );
  },
  {}, // Server options
  { basePath: '/api/mcp/auth' } // Base path for the authenticated MCP server
);

// Token verification function
const verifyToken = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) {
    throw new Error('API key required. Please provide a valid API key in the Authorization header.');
  }

  const authInfo = await validateApiKey(bearerToken);
  if (!authInfo) {
    throw new Error('Invalid API key. Please check your credentials.');
  }

  return authInfo;
};

// Wrap handler with authentication
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes: ['ai:generate'],
  resourceMetadataPath: '/.well-known/oauth-protected-resource',
});

// Export the authenticated handler
export { authHandler as GET, authHandler as POST, authHandler as DELETE };