import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { callV0Dev, callAIGateway } from './lib/callAIs.js';
import { orchestrateAICall } from './lib/orchestrator.js';

// Create MCP server for dual AI orchestrator
const server = new McpServer({
  name: 'dual-ai-orchestrator',
  version: '1.0.0',
  capabilities: {
    tools: {}
  }
});

// Tool: Generate with V0.dev provider
server.tool(
  'generate-v0',
  'Generate content using V0.dev provider',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    system: z.string().optional().describe('Optional system prompt to guide the AI'),
    model: z.string().optional().describe('Optional model override (defaults to config)')
  },
  async ({ prompt, system, model }) => {
    console.error(`[MCP] V0.dev generation request: ${prompt.substring(0, 100)}...`);
    
    try {
      const result = await callV0Dev(prompt, system, model);
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
      console.error(`[MCP] V0.dev error:`, error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'v0.dev',
            success: false,
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool: Generate with AI Gateway provider
server.tool(
  'generate-gateway',
  'Generate content using AI Gateway provider (Anthropic Claude)',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    system: z.string().optional().describe('Optional system prompt to guide the AI'),
    model: z.string().optional().describe('Optional model override (defaults to config)')
  },
  async ({ prompt, system, model }) => {
    console.error(`[MCP] AI Gateway generation request: ${prompt.substring(0, 100)}...`);
    
    try {
      const result = await callAIGateway(prompt, system, model);
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
      console.error(`[MCP] AI Gateway error:`, error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'ai-gateway',
            success: false,
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool: Orchestrated dual AI generation
server.tool(
  'generate-dual',
  'Generate content using both AI providers in parallel and return orchestrated results',
  {
    prompt: z.string().describe('The user prompt for content generation'),
    system: z.string().optional().describe('Optional system prompt to guide the AI'),
    includeAnalysis: z.boolean().optional().describe('Include prompt analysis in results (default: false)')
  },
  async ({ prompt, system, includeAnalysis = false }) => {
    console.error(`[MCP] Dual AI orchestration request: ${prompt.substring(0, 100)}...`);
    
    try {
      const result = await orchestrateAICall(prompt, system, includeAnalysis);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'dual-orchestrator',
            success: true,
            ...result
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`[MCP] Dual orchestration error:`, error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            provider: 'dual-orchestrator',
            success: false,
            error: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Tool: Get available models and configuration
server.tool(
  'get-config',
  'Get available AI models and current configuration',
  {},
  async () => {
    console.error(`[MCP] Configuration request`);
    
    try {
      // Import config dynamically to get current values
      const config = await import('./lib/config.js');
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            providers: {
              'v0.dev': {
                model: config.V0_MODEL || 'default',
                available: !!config.V0_API_KEY
              },
              'ai-gateway': {
                model: config.AI_GATEWAY_MODEL || 'anthropic/claude-4-sonnet',
                baseUrl: config.AI_GATEWAY_BASE_URL || 'https://gateway.ai.cloudflare.com/v1',
                available: !!config.AI_GATEWAY_API_KEY
              }
            },
            capabilities: [
              'generate-v0: Generate content using V0.dev',
              'generate-gateway: Generate content using AI Gateway (Claude)',
              'generate-dual: Orchestrated dual AI generation',
              'get-config: Get configuration and available models'
            ]
          }, null, 2)
        }]
      };
    } catch (error) {
      console.error(`[MCP] Config error:`, error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to load configuration',
            message: error.message
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);

// Start the MCP server
async function main() {
  console.error('Starting Dual AI Orchestrator MCP Server...');
  console.error('Available tools:');
  console.error('  - generate-v0: Generate content using V0.dev provider');
  console.error('  - generate-gateway: Generate content using AI Gateway provider');
  console.error('  - generate-dual: Orchestrated dual AI generation');
  console.error('  - get-config: Get available models and configuration');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('Dual AI Orchestrator MCP Server is running and ready for connections!');
}

main().catch((error) => {
  console.error('MCP Server error:', error);
  process.exit(1);
});