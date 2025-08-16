# Universal MCP Configuration Examples

This document provides configuration examples for connecting to your dual AI orchestrator from various MCP-compatible clients.

## 🎯 Core Configuration (mcp_config.json)

The main configuration file is now valid JSON without comments:

```json
{
  "mcpServers": {
    "dual-ai-orchestrator-remote": {
      "url": "https://b2b2u.vercel.app/api/mcp/mcp",
      "description": "Remote Dual AI Orchestrator - Public Access"
    },
    "dual-ai-orchestrator-auth": {
      "url": "https://b2b2u.vercel.app/api/mcp/auth/mcp",
      "description": "Remote Dual AI Orchestrator - Authenticated Access",
      "env": {
        "MCP_PROXY_AUTH_TOKEN": "${MCP_PRO_API_KEY}"
      }
    }
  }
}
```

## 🤖 Client-Specific Configurations

### Claude Desktop
Use the configuration above directly in your Claude Desktop config file.

### OpenAI ChatGPT
ChatGPT supports MCP through custom GPTs and API integrations.
Use these HTTPS endpoints in your custom GPT actions:
- **Public**: `https://b2b2u.vercel.app/api/mcp/mcp`
- **Authenticated**: `https://b2b2u.vercel.app/api/mcp/auth/mcp`

### Cursor IDE
```json
{
  "mcp": {
    "servers": {
      "dual-ai-orchestrator": {
        "url": "https://b2b2u.vercel.app/api/mcp/mcp"
      }
    }
  }
}
```

### VS Code with Copilot
```json
{
  "github.copilot.chat.mcp.servers": {
    "dual-ai-orchestrator": {
      "url": "https://b2b2u.vercel.app/api/mcp/mcp"
    }
  }
}
```

## 🛠️ Available Tools

Your dual AI orchestrator exposes these tools to ALL AI providers:

- **generate-v0**: Generate UI components using V0.dev
- **generate-gateway**: Generate content using AI Gateway/Claude
- **generate-dual**: Orchestrated parallel generation from both providers
- **get-config**: Retrieve available models and configuration

## ✅ MCP Compatibility

MCP (Model Context Protocol) is provider-agnostic and works with:

- ✅ **Claude Desktop** (Anthropic)
- ✅ **ChatGPT** (OpenAI) - via custom GPTs and API
- ✅ **Cursor IDE**
- ✅ **VS Code with Copilot**
- ✅ **Any MCP-compatible client**

## 🌐 Endpoints

- **Public Access**: `https://b2b2u.vercel.app/api/mcp/mcp`
- **Authenticated Access**: `https://b2b2u.vercel.app/api/mcp/auth/mcp`

## 🔑 Authentication

For authenticated access, set the `MCP_PROXY_AUTH_TOKEN` environment variable or include it in your client configuration.

---

**Note**: The endpoints are configured for the b2b2u.vercel.app deployment.