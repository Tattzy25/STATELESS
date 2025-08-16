# AI Orchestrator

**Proprietary AI orchestration system with dual architecture support.**

## Overview

Unified interface for managing AI completions through multiple providers with sophisticated subscription management.

### Architecture

- **MCP Protocol Interface**: Stateful session management
- **REST API Interface**: Stateless validation
- **Dual AI Providers**: V0.dev and Gate5 integration

## Quick Start

1. Copy `.env.local.example` to `.env.local` and configure
2. Install dependencies: `pnpm install`
3. Start development: `pnpm dev`

## API Endpoints

- `/api/ai-completion` - REST API for AI completions
- `/api/mcp/[transport]` - MCP Protocol endpoint
- `/api/mcp/auth/[transport]` - MCP authentication

## License

**Proprietary Software** - All rights reserved.