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
  // In production, validate against your database/auth service
  const validKeys = {
    'demo-key-123': { id: 'user1', name: 'Demo User', tier: 'free' as const },
    'pro-key-456': { id: 'user2', name: 'Pro User', tier: 'pro' as const },
    'enterprise-key-789': { id: 'user3', name: 'Enterprise User', tier: 'enterprise' as const },
  };

  const user = validKeys[apiKey as keyof typeof validKeys];
  if (!user) return undefined;

  return {
    token: apiKey,
    clientId: user.id,
    scopes: ['ai:generate', 'ai:config'],
    user,
  };
};

// Rate limiting based on user tier
const checkRateLimit = (user: MyAuthInfo['user']): boolean => {
  // Implement your rate limiting logic here
  // For demo purposes, always allow
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