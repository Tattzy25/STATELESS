import { protectedResourceHandler } from 'mcp-handler';

// OAuth Protected Resource Metadata
// This endpoint provides OAuth configuration details for MCP clients
const handler = protectedResourceHandler({
  // Real authorization server URLs for b2b2u.vercel.app
  authServerUrls: [
    'https://b2b2u.vercel.app/api/mcp/auth', // Primary MCP auth endpoint
    'https://accounts.google.com', // Google OAuth for additional auth options
    'https://github.com/login/oauth', // GitHub OAuth for developer access
  ],
});

// Export the handler for HTTP methods
export { handler as GET, handler as POST, handler as OPTIONS };