# @runwell/agent-core

Core AI agent infrastructure for Business in a Box.

## Installation

```bash
pnpm add @runwell/agent-core
```

## Quick Start

```typescript
import {
  BaseAgent,
  AgentContext,
  AgentResult,
  AgentTool,
} from '@runwell/agent-core';

// Create a custom agent
class GreeterAgent extends BaseAgent {
  readonly agentType = 'greeter';
  readonly systemPrompt = `You are a friendly greeter. Help users with basic questions.`;

  constructor() {
    super();
    this.registerTool(this.getTimeToolDefinition());
  }

  private getTimeToolDefinition(): AgentTool {
    return {
      name: 'get_current_time',
      description: 'Get the current time',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => new Date().toISOString(),
    };
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const response = await this.chat(context.query || 'Hello!', context);
    return {
      agentType: this.agentType,
      success: true,
      response: response.text,
      confidence: 1.0,
    };
  }
}

// Use the agent
const agent = new GreeterAgent();
const result = await agent.analyze({
  clientId: 'my-business',
  sessionId: 'session-123',
  query: 'What time is it?',
});
console.log(result.response);
```

## Exports

### Base Classes

- `BaseAgent` - Abstract base class for all agents

### LLM Clients

- `GeminiClient` - Google Gemini API client
- `getGeminiClient()` - Get singleton Gemini client

### Memory

- `FilesystemMemory` - File-based session storage
- `getFilesystemMemory()` - Get singleton memory instance

### Security

- `SecurityGuard` - Input/output validation (Phase 1)
- `createSecurityGuard()` - Create security guard instance

### Types

All TypeScript types are exported for use in your agents.

## Environment Variables

```bash
GOOGLE_AI_API_KEY=your-api-key
```

## Documentation

- [Agent Core Specification](../../docs/agent-core.md)
- [Security Checklist](../../docs/agent-security-checklist.md)
- [Implementation Roadmap](../../docs/agent-implementation-roadmap.md)

## License

MIT
