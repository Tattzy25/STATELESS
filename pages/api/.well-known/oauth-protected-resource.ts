import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';
import type { NextApiRequest, NextApiResponse } from 'next';

// OAuth Protected Resource Metadata
// This endpoint provides OAuth configuration details for MCP clients
const handler = protectedResourceHandler({
  // Replace with your actual Authorization Server URLs
  // For demo purposes, we're using a placeholder
  authServerUrls: [
    'https://your-auth-server.com', // Replace with your OAuth provider
    'https://auth0.com', // Example: Auth0
    'https://accounts.google.com', // Example: Google OAuth
  ],
  // Additional metadata can be added here
  scopes: [
    'ai:generate', // Permission to use AI generation tools
    'ai:config',   // Permission to access configuration
  ],
  // Resource server information
  resource: 'https://your-app-name.vercel.app/api/mcp/auth',
  // Supported token types
  tokenTypes: ['Bearer'],
});

// Handle CORS preflight requests
export default function mcpOAuthMetadata(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    return metadataCorsOptionsRequestHandler(req, res);
  }
  
  if (req.method === 'GET') {
    return handler(req, res);
  }
  
  // Method not allowed
  res.setHeader('Allow', ['GET', 'OPTIONS']);
  res.status(405).json({ error: 'Method not allowed' });
}