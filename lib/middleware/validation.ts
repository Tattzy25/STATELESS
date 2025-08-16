import { NextApiRequest, NextApiResponse } from 'next';
import { validateUserContext, UserContext } from '../subscriptions/stateless-validator';

/**
 * Middleware to validate required headers for stateless API requests
 */
export function validateHeaders(req: NextApiRequest, res: NextApiResponse): UserContext | null {
  try {
    return validateUserContext(req.headers);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: `Invalid headers: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    return null;
  }
}

/**
 * Higher-order function to wrap API handlers with header validation
 */
export function withValidation(
  handler: (req: NextApiRequest, res: NextApiResponse, userContext: UserContext) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Only POST requests are supported.'
      });
    }

    const userContext = validateHeaders(req, res);
    if (!userContext) {
      // Response already sent by validateHeaders
      return;
    }

    try {
      await handler(req, res, userContext);
    } catch (error) {
      console.error('API handler error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}

/**
 * CORS middleware for API routes
 */
export function withCors(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-tier, x-user-credits, x-user-completions, x-user-completions-used, x-user-projects, x-has-dual-access, x-v0-api-key, x-claude-api-key');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  
  return false;
}