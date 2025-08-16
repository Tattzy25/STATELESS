import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import { callV0Dev, callAIGateway } from '../../../lib/callAIs';
import { orchestrate, OrchestrationOptions } from '../../../lib/orchestrator';
import { getAvailableModels, TIER_CONFIGS, TierType } from '../../../lib/config';
import { 
  subscriptionManager, 
  SubscriptionTier, 
  SUBSCRIPTION_CONFIGS, 
  CREDIT_PACKAGES,
  subscriptionSchema,
  projectSchema
} from '../../../lib/subscriptions';
import { StatelessSubscriptionValidator } from '../../../lib/subscriptions/stateless-validator';

// Define input schemas for our tools
const generateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
  userId: z.string().optional().default('anonymous'),
});

const dualGenerateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  systemPrompt: z.string().optional(),
  tier: z.enum(['basic', 'premium', 'enterprise']).default('basic'),
  v0Model: z.string().optional(),
  gatewayModel: z.string().optional(),
  userId: z.string().optional().default('anonymous'),
});

// Create the MCP handler with tools
const handler = createMcpHandler(
  async (server) => {
    // Tool 1: Generate using V0.dev
    server.tool(
      'generate-v0',
      'Generate content using V0.dev provider with React/Next.js focus (Free tier: single AI only)',
      generateSchema,
      async ({ prompt, systemPrompt, model, userId }) => {
        try {
          // Get user context from subscription manager (for MCP compatibility)
          const user = subscriptionManager.getUserSubscription(userId);
          const apiKeys = subscriptionManager.getUserApiKeys(userId);
          
          // Create user context for stateless validation
          const userContext = {
            userId,
            tier: user.tier,
            usage: {
              credits: user.creditsRemaining,
              completions: user.completionsUsed,
              completionsUsed: user.completionsUsed,
              projects: user.projectsCreated,
              hasDualAccess: user.hasDualAccess
            },
            apiKeys: {
              v0ApiKey: apiKeys?.v0ApiKey,
              claudeApiKey: apiKeys?.claudeApiKey
            }
          };
          
          // Validate action using stateless validator
          const validation = StatelessSubscriptionValidator.validateAction(userContext, 'single-ai');
          
          if (!validation.canProceed) {
            return {
              content: [{
                type: 'text',
                text: validation.error || 'Usage limit reached'
              }]
            };
          }
          
          // Get API keys to use
          const keys = StatelessSubscriptionValidator.getApiKeys(userContext);
          
          const result = await callV0Dev(prompt, systemPrompt, model, keys.v0ApiKey);
          
          // Deduct usage in subscription manager (for MCP state persistence)
          if (subscriptionManager.hasCompletionsRemaining(userId)) {
            subscriptionManager.useCompletion(userId);
          } else {
            subscriptionManager.useCredits(userId, 1);
          }
          
          // Get updated usage for response
          const updatedUser = subscriptionManager.getUserSubscription(userId);
          
          return {
            content: [{
              type: 'text',
              text: `✅ V0.dev Response (${user.tier} tier):\n${result}\n\n📊 Usage: ${updatedUser.completionsUsed} completions used, $${updatedUser.creditsRemaining} credits remaining`
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

    // Tool 2: Generate using AI Gateway (Anthropic Claude)
    server.tool(
      'generate-gateway',
      'Generate content using AI Gateway with Anthropic Claude models (Free tier: single AI only)',
      generateSchema,
      async ({ prompt, systemPrompt, model, userId }) => {
        try {
          // Check user subscription and usage limits
          const user = subscriptionManager.getUserSubscription(userId);
          
          // Check if user has credits or completions
          if (!subscriptionManager.hasCreditsRemaining(userId, 1) && !subscriptionManager.hasCompletionsRemaining(userId)) {
            return {
              content: [{
                type: 'text',
                text: `❌ Usage limit reached. Current tier: ${user.tier}\n\n💡 Upgrade to Pro ($20/month) for 300 completions + $20 credits\n💡 Or purchase credits: $3 (50 completions), $5 (150 completions), $7 (300 completions), $10 (500 completions)\n\n🔥 Any purchase unlocks Dual AI Builder!`
              }]
            };
          }
          
          // Use appropriate API keys (BYOK or server keys)
          const apiKeys = subscriptionManager.getUserApiKeys(userId);
          const claudeApiKey = (user.tier === SubscriptionTier.MCP_PRO_BYOK && apiKeys?.claudeApiKey) ? apiKeys.claudeApiKey : undefined;
          
          const result = await callAIGateway(prompt, systemPrompt, model, claudeApiKey);
          
          // Deduct usage
          if (subscriptionManager.hasCompletionsRemaining(userId)) {
            subscriptionManager.useCompletion(userId);
          } else {
            subscriptionManager.useCredits(userId, 1);
          }
          
          return {
            content: [{
              type: 'text',
              text: `✅ AI Gateway Response (${user.tier} tier):\n${result}\n\n📊 Usage: ${user.completionsUsed} completions used, $${user.creditsRemaining} credits remaining`
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

    // Tool 3: Generate using both providers (Dual AI) - Premium Feature
    server.tool(
      'generate-dual',
      '🔥 Dual AI Builder: Generate using both V0.dev and AI Gateway for comprehensive results (Premium feature - unlocked with any purchase)',
      dualGenerateSchema,
      async ({ prompt, systemPrompt, tier, v0Model, gatewayModel, userId }) => {
        try {
          // Check user subscription and dual AI access
          const user = subscriptionManager.getUserSubscription(userId);
          
          // Check if user has dual AI access (any purchase unlocks it)
          if (!subscriptionManager.hasDualAIAccess(userId)) {
            return {
              content: [{
                type: 'text',
                text: `🔒 Dual AI Builder is a premium feature!\n\n🔥 Unlock with any purchase:\n💡 Pro subscription ($20/month): 300 completions + $20 credits\n💡 Credit top-ups: $3 (50 completions), $5 (150 completions), $7 (300 completions), $10 (500 completions)\n\n✨ Dual AI combines Claude Sonnet 4 (backend logic) + V0.dev (frontend design) for complete solutions!`
              }]
            };
          }
          
          // Validate tier access based on user subscription
          const requestedTier = tier as TierType;
          if (requestedTier === 'premium' && user.tier === 'free') {
            return {
              content: [{
                type: 'text',
                text: `🔒 Premium tier requires a paid subscription. Current tier: ${user.tier}`
              }]
            };
          }
          
          if (requestedTier === 'enterprise' && !['pro', 'enterprise'].includes(user.tier)) {
            return {
              content: [{
                type: 'text',
                text: `🔒 Enterprise tier requires a pro or enterprise subscription. Current tier: ${user.tier}`
              }]
            };
          }
          
          // Check if user has enough credits (dual AI costs based on tier)
          const tierConfig = TIER_CONFIGS[requestedTier];
          const creditsRequired = Math.ceil(tierConfig.estimatedCost / 10); // Convert cost to credits
          
          if (!subscriptionManager.hasCreditsRemaining(userId, creditsRequired) && !subscriptionManager.hasCompletionsRemaining(userId)) {
            return {
              content: [{
                type: 'text',
                text: `❌ Insufficient credits for ${requestedTier} tier Dual AI (requires ${creditsRequired} credits). Current tier: ${user.tier}\n\n💡 Purchase more credits: $3 (50 completions), $5 (150 completions), $7 (300 completions), $10 (500 completions)`
              }]
            };
          }
          
          // Use appropriate API keys (BYOK or server keys)
          const apiKeys = subscriptionManager.getUserApiKeys(userId);
          const v0ApiKey = (user.tier === SubscriptionTier.MCP_PRO_BYOK && apiKeys?.v0ApiKey) ? apiKeys.v0ApiKey : undefined;
        const claudeApiKey = (user.tier === SubscriptionTier.MCP_PRO_BYOK && apiKeys?.claudeApiKey) ? apiKeys.claudeApiKey : undefined;
          
          // Use the new orchestrate function with tier support
          const orchestrationOptions: OrchestrationOptions = {
            tier: requestedTier,
            apiKeys: {
              v0: v0ApiKey,
              aiGateway: claudeApiKey
            }
          };
          
          const result = await orchestrate(prompt, orchestrationOptions);
          
          // Deduct usage based on tier cost
          if (subscriptionManager.hasCompletionsRemaining(userId)) {
            subscriptionManager.useCompletion(userId);
          } else {
            subscriptionManager.useCredits(userId, creditsRequired);
          }
          
          return {
            content: [{
              type: 'text',
              text: `🚀 Dual AI Builder Results (${result.tier} tier - ${result.tierDescription}):\n\n${result.result}\n\n💰 Estimated Cost: $${result.estimatedCost.toFixed(4)}\n📊 Usage: ${user.completionsUsed} completions used, $${user.creditsRemaining} credits remaining`
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

    // Tool 4: Get available models and configuration
    server.tool(
      'get-config',
      'Get available AI models, tier configurations, and subscription info',
      z.object({}),
      async () => {
        try {
          const models = getAvailableModels();
          return {
            content: [{
              type: 'text',
              text: `Available Configuration:\n${JSON.stringify({
                ...models,
                tierConfigs: TIER_CONFIGS,
                subscriptionTiers: SUBSCRIPTION_CONFIGS,
                creditPackages: CREDIT_PACKAGES
              }, null, 2)}`
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

    // Tool 5: Subscription Management
     server.tool(
       'manage-subscription',
       'Manage user subscriptions, view usage, purchase credits, or upgrade tiers',
       subscriptionSchema,
       async ({ action, userId, tier, packageKey, apiKeys }) => {
        try {
          switch (action) {
            case 'get-status':
              const user = subscriptionManager.getUserSubscription(userId);
              const config = SUBSCRIPTION_CONFIGS[user.tier];
              return {
                content: [{
                  type: 'text',
                  text: `📊 Subscription Status for User: ${userId}\n\n` +
                        `🎯 Current Tier: ${user.tier} (${config.price})\n` +
                        `💰 Credits Remaining: $${user.creditsRemaining}\n` +
                        `📝 Completions: ${user.completionsUsed}/${config.monthlyCompletions === -1 ? '∞' : config.monthlyCompletions}\n` +
                        `📁 Projects: ${user.projectsCreated}/${config.projectLimit === -1 ? '∞' : config.projectLimit}\n` +
                        `🔥 Dual AI Access: ${subscriptionManager.hasDualAIAccess(userId) ? '✅ Unlocked' : '🔒 Locked'}\n\n` +
                        `🛒 Available Actions:\n` +
                        `• Purchase credits: $3, $5, $7, $10\n` +
                        `• Upgrade to Pro ($20/month)\n` +
                        `• Setup BYOK (Pro BYOK $10/month)`
                }]
              };

            case 'purchase-credits':
              if (!packageKey || !CREDIT_PACKAGES[packageKey]) {
                return {
                  content: [{
                    type: 'text',
                    text: `❌ Invalid credit package. Available: ${Object.keys(CREDIT_PACKAGES).join(', ')}`
                  }]
                };
              }
              
              const creditPackage = CREDIT_PACKAGES[packageKey];
              subscriptionManager.purchaseCredits(userId, packageKey);
              
              return {
                content: [{
                  type: 'text',
                  text: `✅ Credits purchased successfully!\n\n` +
                        `💰 Package: ${packageKey} - $${creditPackage.price}\n` +
                        `🎯 Credits Added: $${creditPackage.credits}\n` +
                        `📝 Completions Added: ${creditPackage.completions}\n` +
                        `🔥 Dual AI Builder: Now Unlocked!\n\n` +
                        `📊 New Balance: $${subscriptionManager.getUserSubscription(userId).creditsRemaining} credits`
                }]
              };

            case 'upgrade-tier':
              if (!tier || !Object.values(SubscriptionTier).includes(tier as SubscriptionTier)) {
                return {
                  content: [{
                    type: 'text',
                    text: `❌ Invalid tier. Available: ${Object.values(SubscriptionTier).join(', ')}`
                  }]
                };
              }
              
              subscriptionManager.upgradeTier(userId, tier as SubscriptionTier);
              const newUser = subscriptionManager.getUserSubscription(userId);
              const newConfig = SUBSCRIPTION_CONFIGS[newUser.tier];
              
              return {
                content: [{
                  type: 'text',
                  text: `🎉 Subscription upgraded successfully!\n\n` +
                        `🎯 New Tier: ${newUser.tier} (${newConfig.price})\n` +
                        `📝 Monthly Completions: ${newConfig.monthlyCompletions === -1 ? 'Unlimited' : newConfig.monthlyCompletions}\n` +
                        `💰 Credits Included: $${newConfig.monthlyCredits}\n` +
                        `🔥 Dual AI Builder: ${subscriptionManager.hasDualAIAccess(userId) ? '✅ Unlocked' : '🔒 Locked'}`
                }]
              };

            case 'setup-byok':
              if (!apiKeys || (!apiKeys.v0ApiKey && !apiKeys.claudeApiKey)) {
                return {
                  content: [{
                    type: 'text',
                    text: `❌ BYOK setup requires at least one API key (v0ApiKey or claudeApiKey)`
                  }]
                };
              }
              
              subscriptionManager.setupBYOK(userId, apiKeys);
              
              return {
                content: [{
                  type: 'text',
                  text: `🔑 BYOK setup completed!\n\n` +
                        `✅ V0 API Key: ${apiKeys.v0ApiKey ? 'Configured' : 'Not provided'}\n` +
                        `✅ Claude API Key: ${apiKeys.claudeApiKey ? 'Configured' : 'Not provided'}\n` +
                        `💰 Pro BYOK Discount: 50% off ($10/month)\n\n` +
                        `🎯 You can now use your own API keys with Pro features!`
                }]
              };

            default:
              return {
                content: [{
                  type: 'text',
                  text: `❌ Invalid action. Available: get-status, purchase-credits, upgrade-tier, setup-byok`
                }]
              };
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error managing subscription: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
       }
     );

    // Tool 6: Project Management
    server.tool(
      'manage-projects',
      'Create and manage user projects with tier-based limits (Free: 200 projects, Pro: unlimited)',
      projectSchema,
      async ({ action, userId, projectName, projectType }) => {
        try {
          switch (action) {
            case 'create':
              if (!projectName) {
                return {
                  content: [{
                    type: 'text',
                    text: `❌ Project name is required for creation`
                  }]
                };
              }
              
              if (!subscriptionManager.canCreateProject(userId)) {
                const user = subscriptionManager.getUserSubscription(userId);
                const config = SUBSCRIPTION_CONFIGS[user.tier];
                return {
                  content: [{
                    type: 'text',
                    text: `🚫 Project limit reached!\n\n` +
                          `📊 Current: ${user.projectsCreated}/${config.projectLimit} projects\n` +
                          `🎯 Tier: ${user.tier}\n\n` +
                          `💡 Upgrade to Pro for unlimited projects ($20/month)\n` +
                          `💡 Or try Pro BYOK with your own API keys ($10/month)`
                  }]
                };
              }
              
              const created = subscriptionManager.createProject(userId, projectName);
              if (created) {
                const usage = subscriptionManager.getProjectUsage(userId);
                return {
                  content: [{
                    type: 'text',
                    text: `✅ Project "${projectName}" created successfully!\n\n` +
                          `📁 Type: ${projectType || 'General'}\n` +
                          `📊 Usage: ${usage.used}/${usage.limit === -1 ? '∞' : usage.limit} projects\n` +
                          `🎯 Tier: ${subscriptionManager.getUserSubscription(userId).tier}`
                  }]
                };
              } else {
                return {
                  content: [{
                    type: 'text',
                    text: `❌ Failed to create project. Please try again.`
                  }]
                };
              }

            case 'get-usage':
              const usage = subscriptionManager.getProjectUsage(userId);
              const user = subscriptionManager.getUserSubscription(userId);
              return {
                content: [{
                  type: 'text',
                  text: `📊 Project Usage for User: ${userId}\n\n` +
                        `📁 Projects Created: ${usage.used}\n` +
                        `🎯 Project Limit: ${usage.limit === -1 ? 'Unlimited' : usage.limit}\n` +
                        `✅ Can Create More: ${usage.canCreate ? 'Yes' : 'No'}\n` +
                        `🎫 Current Tier: ${user.tier}\n\n` +
                        `${!usage.canCreate ? '💡 Upgrade to Pro for unlimited projects!' : '🚀 Ready to create more projects!'}`
                }]
              };

            case 'list':
              // This would typically fetch from a database
              // For now, just show the count
              const listUsage = subscriptionManager.getProjectUsage(userId);
              return {
                content: [{
                  type: 'text',
                  text: `📋 Project List for User: ${userId}\n\n` +
                        `📊 Total Projects: ${listUsage.used}\n` +
                        `🎯 Remaining Slots: ${listUsage.limit === -1 ? 'Unlimited' : (listUsage.limit - listUsage.used)}\n\n` +
                        `💡 Note: Detailed project listing requires database integration`
                }]
              };

            default:
              return {
                content: [{
                  type: 'text',
                  text: `❌ Invalid action. Available: create, get-usage, list`
                }]
              };
          }
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: `Error managing projects: ${error instanceof Error ? error.message : 'Unknown error'}`
            }]
          };
        }
      }
    );
   },
   {}, // Server options
  { basePath: '/api/mcp' } // Base path for the MCP server
);

// Export the handler for all HTTP methods
export { handler as GET, handler as POST, handler as DELETE };