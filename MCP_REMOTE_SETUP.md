# Remote MCP Server Setup Guide

## Overview

This dual AI orchestrator is now available as a **remote MCP server** that can be accessed by external users via HTTPS endpoints. No local installation required!

## 🌐 Remote Access URLs

### Public Endpoint (No Authentication)
```
https://b2b2u.vercel.app/api/mcp/mcp
```

### Authenticated Endpoint (API Key Required)
```
https://b2b2u.vercel.app/api/mcp/auth/mcp
```

## 🔧 Client Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dual-ai-remote": {
      "url": "https://b2b2u.vercel.app/api/mcp/mcp",
      "description": "Remote dual AI orchestrator (V0.dev + AI Gateway)"
    }
  }
}
```

### For Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dual-ai-remote": {
      "url": "https://b2b2u.vercel.app/api/mcp/mcp"
    }
  }
}
```

### For VS Code with Copilot

Add to your VS Code `settings.json`:

```json
{
  "mcp.servers": {
    "dual-ai-remote": {
      "url": "https://b2b2u.vercel.app/api/mcp/mcp",
      "transport": "http"
    }
  }
}
```

## 🔐 Authentication Setup (Optional)

For enhanced features and rate limiting, use the authenticated endpoint:

### API Keys

Generate secure API keys for each tier (minimum 32 characters):
- **Free Tier**: Set `MCP_FREE_API_KEY` in your environment
- **Pro Tier**: Set `MCP_PRO_API_KEY` in your environment
- **Enterprise Tier**: Set `MCP_ENTERPRISE_API_KEY` in your environment

### Authenticated Configuration

```json
{
  "mcpServers": {
    "dual-ai-auth": {
      "url": "https://b2b2u.vercel.app/api/mcp/auth/mcp",
      "headers": {
        "Authorization": "Bearer ${MCP_PRO_API_KEY}"
      }
    }
  }
}
```

## 🛠️ Available Tools

### 1. `generate-v0`
**Description**: Generate content using V0.dev (React/Next.js focused)

**Parameters**:
- `prompt` (required): Your generation prompt
- `systemPrompt` (optional): Custom system instructions
- `model` (optional): Specific V0 model to use

### 2. `generate-gateway`
**Description**: Generate content using AI Gateway (Anthropic Claude)

**Parameters**:
- `prompt` (required): Your generation prompt
- `systemPrompt` (optional): Custom system instructions  
- `model` (optional): Specific Claude model to use

### 3. `generate-dual` ⭐
**Description**: Orchestrated parallel generation from both providers

**Parameters**:
- `prompt` (required): Your generation prompt
- `systemPrompt` (optional): Custom system instructions
- `v0Model` (optional): V0.dev model preference
- `gatewayModel` (optional): AI Gateway model preference

**Note**: Pro+ feature only (requires authentication)

### 4. `get-config`
**Description**: Get available models and user information

**Parameters**: None

## 🚀 Usage Examples

### Basic Usage (Any MCP Client)

```
# Generate a React component
Use the generate-v0 tool with prompt: "Create a responsive navbar component with dark mode toggle"

# Get AI analysis
Use the generate-gateway tool with prompt: "Analyze the pros and cons of microservices architecture"

# Get the best of both worlds
Use the generate-dual tool with prompt: "Design a user authentication system"
```

### Advanced Usage with Authentication

```
# Check your account status
Use the get-config tool to see your tier and available features

# Pro users get faster dual generation
Use generate-dual for complex prompts requiring both React expertise and general AI analysis
```

## 📊 Feature Comparison

| Feature | Public | Free Auth | Pro Auth | Enterprise Auth |
|---------|--------|-----------|----------|----------------|
| V0.dev Generation | ✅ | ✅ | ✅ | ✅ |
| AI Gateway Generation | ✅ | ✅ | ✅ | ✅ |
| Dual Generation | ❌ | ❌ | ✅ | ✅ |
| Rate Limiting | Basic | Standard | Higher | Unlimited |
| Priority Support | ❌ | ❌ | ❌ | ✅ |
| User Analytics | ❌ | ✅ | ✅ | ✅ |

## 🔍 Testing Your Connection

### Using MCP Inspector

```bash
# Test the public endpoint
npx @modelcontextprotocol/inspector@latest https://b2b2u.vercel.app/api/mcp/mcp

# Test the authenticated endpoint
npx @modelcontextprotocol/inspector@latest https://b2b2u.vercel.app/api/mcp/auth/mcp
```

### Manual Testing

1. **Connect**: Add the server to your MCP client
2. **List Tools**: Verify all 4 tools are available
3. **Test Generation**: Try each tool with a simple prompt
4. **Check Config**: Use `get-config` to verify connection

## 🚨 Troubleshooting

### Common Issues

**Connection Failed**
- Verify the URL is correct
- Check your internet connection
- Ensure the server is deployed and running

**Authentication Errors**
- Verify your API key is correct
- Check the Authorization header format: `Bearer your-key`
- Ensure you're using the `/auth/mcp` endpoint for authenticated requests

**Tool Not Available**
- Free users: `generate-dual` requires Pro+ subscription
- Check your account tier with `get-config`
- Verify the tool name is spelled correctly

**Rate Limiting**
- Upgrade to Pro for higher limits
- Wait before retrying requests
- Use `get-config` to check your current limits

## 🌟 Benefits of Remote MCP

✅ **No Local Setup**: Just add the URL to your MCP client
✅ **Always Updated**: Server updates automatically
✅ **Scalable**: Handles multiple concurrent users
✅ **Secure**: OAuth authentication and rate limiting
✅ **Cross-Platform**: Works with any MCP-compatible client
✅ **Reliable**: Hosted on Vercel's global infrastructure

## 📞 Support

For issues or questions:
- Check this documentation first
- Test with the MCP inspector
- Verify your API key and permissions
- Contact support with your user ID and error details

---

**Ready to get started?** Just add the URL to your favorite MCP client and start generating!