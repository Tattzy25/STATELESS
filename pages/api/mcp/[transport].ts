import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { callV0Dev, callAIGateway } from '../../../lib/callAIs';
import { orchestrateAICalls } from '../../../lib/orchestrator';
import { getAvailableModels, TIER_CONFIGS, TierType } from '../../../lib/config';
import { 
  subscriptionManager, 
  SubscriptionTier, 
  SUBSCRIPTION_CONFIGS, 
  CREDIT_PACKAGES
} from '../../../lib/subscriptions';

// Create MCP server instance
const server = new McpServer({
  name: 'dual-ai-orchestrator',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

// Tool 1: Get Available Packages
server.tool(
  'get-packages',
  'Get available credit packages for purchase',
  {
    userId: z.string().optional().default('anonymous').describe('User ID for personalized recommendations')
  },
  async ({ userId }) => {
    try {
      const user = subscriptionManager.getUserSubscription(userId);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            packages: CREDIT_PACKAGES,
            userInfo: {
              tier: user.tier,
              creditsRemaining: user.creditsRemaining,
              completionsUsed: user.completionsUsed
            },
            recommendations: Object.values(CREDIT_PACKAGES).map(pkg => ({
              ...pkg,
              recommended: user.creditsRemaining < 5 && pkg.key === 'medium'
            }))
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Failed to load packages', message: error.message }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool 2: Purchase Package
server.tool(
  'purchase-package',
  'Purchase a credit package to add credits to your account',
  {
    packageKey: z.enum(['small', 'medium', 'large', 'xlarge']).describe('Package to purchase'),
    userId: z.string().optional().default('anonymous').describe('User ID for purchase')
  },
  async ({ packageKey, userId }) => {
    try {
      const success = subscriptionManager.purchaseCreditPackage(userId, packageKey);
      const user = subscriptionManager.getUserSubscription(userId);
      const package_ = CREDIT_PACKAGES[packageKey];
      
      if (success) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Successfully purchased ${package_.name}!`,
              package: package_,
              newBalance: {
                credits: user.creditsRemaining,
                hasDualAI: user.hasDualAI
              }
            }, null, 2)
          }]
        };
      } else {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({ success: false, message: 'Purchase failed' }, null, 2)
          }],
          isError: true
        };
      }
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Purchase failed', message: error.message }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool 3: Generate using V0.dev (with credit check)
server.tool(
  'generate-v0',
  'Generate content using V0.dev provider with React/Next.js focus',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    systemPrompt: z.string().optional().describe('Optional system prompt to guide the AI'),
    model: z.string().optional().describe('Optional model override (defaults to config)'),
    userId: z.string().optional().default('anonymous').describe('User ID for tracking')
  },
  async ({ prompt, systemPrompt, model, userId }) => {
    try {
      // Get user context from subscription manager
      const user = subscriptionManager.getUserSubscription(userId);
      
      // Check if user has credits remaining
      if (!subscriptionManager.hasCreditsRemaining(userId)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              provider: 'v0.dev',
              success: false,
              error: 'Insufficient credits remaining'
            }, null, 2)
          }]
        };
      }
      
      // Use credits
      subscriptionManager.useCredits(userId, 1);
      
      const result = await callV0Dev(prompt, systemPrompt, model);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'v0.dev',
            success: true,
            content: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'v0.dev',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// Tool 4: Generate using AI Gateway
server.tool(
  'generate-gateway',
  'Generate content using AI Gateway provider (Anthropic Claude)',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    systemPrompt: z.string().optional().describe('Optional system prompt to guide the AI'),
    model: z.string().optional().describe('Optional model override (defaults to config)'),
    userId: z.string().optional().default('anonymous').describe('User ID for tracking')
  },
  async ({ prompt, systemPrompt, model, userId }) => {
    try {
      // Get user context from subscription manager
      const user = subscriptionManager.getUserSubscription(userId);
      
      // Check if user has credits remaining
      if (!subscriptionManager.hasCreditsRemaining(userId)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              provider: 'ai-gateway',
              success: false,
              error: 'Insufficient credits remaining'
            }, null, 2)
          }]
        };
      }
      
      // Use credits
      subscriptionManager.useCredits(userId, 1);
      
      const result = await callAIGateway(prompt, systemPrompt, model);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'ai-gateway',
            success: true,
            content: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'ai-gateway',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// Tool 5: Dual AI Generation
server.tool(
  'generate-dual',
  'Generate content using both AI providers in parallel and return orchestrated results',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    systemPrompt: z.string().optional().describe('Optional system prompt to guide the AI'),
    tier: z.enum(['basic', 'premium', 'enterprise']).default('basic').describe('Subscription tier'),
    userId: z.string().optional().default('anonymous').describe('User ID for tracking')
  },
  async ({ prompt, systemPrompt, tier, userId }) => {
    try {
      // Get user context from subscription manager
      const user = subscriptionManager.getUserSubscription(userId);
      
      // Check if user can use dual AI
      if (!subscriptionManager.canUseDualAI(userId)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              provider: 'dual-ai',
              success: false,
              error: 'Dual AI access not available for your subscription tier'
            }, null, 2)
          }]
        };
      }
      
      // Check if user has credits remaining (dual AI costs 2 credits)
      if (!subscriptionManager.hasCreditsRemaining(userId, 2)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              provider: 'dual-ai',
              success: false,
              error: 'Insufficient credits remaining (dual AI requires 2 credits)'
            }, null, 2)
          }]
        };
      }
      
      // Use credits
      subscriptionManager.useCredits(userId, 2);
      
      const result = await orchestrateAICalls({
        prompt,
        systemPrompt,
        tier: tier as TierType,
        includeAnalysis: true
      });
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'dual-ai',
            success: true,
            content: result
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'dual-ai',
            success: false,
            error: error.message
          }, null, 2)
        }]
      };
    }
  }
);

// Tool 4: Get User Status & Configuration
server.tool(
  'get-config',
  'Get user subscription status, available packages, and system configuration',
  {
    userId: z.string().optional().default('anonymous').describe('User ID for personalized config')
  },
  async ({ userId }) => {
    try {
      const user = subscriptionManager.getUserSubscription(userId);
      const availableModels = getAvailableModels();
      const tierConfig = TIER_CONFIGS[user.tier] || TIER_CONFIGS.basic;
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            user: {
              id: userId,
              tier: user.tier,
              creditsRemaining: user.creditsRemaining,
              completionsUsed: user.completionsUsed,
              canUseDualAI: subscriptionManager.canUseDualAI(userId)
            },
            availablePackages: CREDIT_PACKAGES,
            subscriptionTiers: SUBSCRIPTION_CONFIGS,
            models: availableModels,
            tierConfig,
            recommendations: {
              suggestedPackage: user.creditsRemaining < 5 ? 'medium' : null,
              canUseDualAI: subscriptionManager.canUseDualAI(userId),
              nextTierBenefits: user.tier === 'mcp_free' ? 'Upgrade to Pro for unlimited projects and dual AI' : null
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Next.js API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      // Handle MCP protocol over HTTP
      const transport = new SSEServerTransport('/api/mcp/mcp', res);
      await server.connect(transport);
      
      // Process the request
      res.status(200).json({ status: 'MCP server ready' });
    } catch (error) {
      console.error('MCP Server error:', error);
      res.status(500).json({ error: 'MCP server failed to start' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).json({ error: 'Method not allowed' });
  }
}