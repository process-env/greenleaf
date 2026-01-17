---
name: ai-sdk-agents
description: Building production AI agents with Vercel AI SDK 6. Covers the agent() abstraction, ToolLoopAgent, tool calling, human-in-the-loop approval, MCP support, multi-step reasoning, streaming, memory systems, multi-agent orchestration, ReAct patterns, and production best practices for agentic applications.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  ai-sdk: "6.x"
---

# AI SDK 6 Agents

## Purpose

Comprehensive guide for building market-leading AI agents using Vercel's AI SDK 6. Covers the new Agent abstraction, tool calling, human-in-the-loop approval, agentic loops, streaming, memory patterns, multi-agent orchestration, and production-grade error handling.

> **Updated 2026-01-11:** AI SDK 6 introduces first-class Agent abstraction, human-in-the-loop tool approval, MCP support, and DevTools. Migration from v5: `npx @ai-sdk/codemod v6`

## When to Use This Skill

Automatically activates when working on:
- Building AI agents with tool calling
- Using the Agent abstraction or ToolLoopAgent
- Implementing multi-step reasoning loops
- Human-in-the-loop tool approval
- Creating agentic workflows
- Streaming AI responses
- Memory and context management
- Multi-agent systems
- Production AI agent deployment

---

## Quick Start

### Installation

```bash
npm install ai @ai-sdk/openai
# or with Anthropic
npm install ai @ai-sdk/anthropic
```

### Basic Agent Setup (AI SDK 6 - Agent Abstraction)

```typescript
import { agent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Define reusable agent (AI SDK 6 pattern)
const weatherAgent = agent({
    model: openai('gpt-4o'),
    system: 'You are a helpful weather assistant.',
    tools: {
        getWeather: tool({
            description: 'Get weather for a location',
            parameters: z.object({
                location: z.string().describe('City name'),
            }),
            execute: async ({ location }) => {
                return { temperature: 72, condition: 'sunny' };
            },
        }),
    },
    maxSteps: 5,
});

// Use the agent anywhere in your app
const result = await weatherAgent.generateText({
    prompt: 'What is the weather in San Francisco?',
});
```

### Legacy Pattern (generateText - still supported)

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'What is the weather in San Francisco?',
    tools: {
        getWeather: tool({
            description: 'Get weather for a location',
            parameters: z.object({
                location: z.string().describe('City name'),
            }),
            execute: async ({ location }) => {
                return { temperature: 72, condition: 'sunny' };
            },
        }),
    },
    maxSteps: 5,
});
```

---

## AI SDK 6 Agent Abstraction

### Why Use Agent Abstraction?

The `agent()` function lets you define your agent once and reuse it across:
- Chat UIs
- Background jobs
- API endpoints
- Different components

```typescript
import { agent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

// Define agent with all configuration
export const supportAgent = agent({
    model: openai('gpt-4o'),
    system: `You are a customer support agent. Be helpful and professional.`,
    tools: {
        lookupOrder: tool({ /* ... */ }),
        createTicket: tool({ /* ... */ }),
        sendEmail: tool({ /* ... */ }),
    },
    maxSteps: 10,
});

// Use in API route
export async function POST(req: Request) {
    const { messages } = await req.json();
    const result = supportAgent.streamText({ messages });
    return result.toDataStreamResponse();
}

// Use in background job
await supportAgent.generateText({
    prompt: `Process refund for order ${orderId}`,
});
```

### ToolLoopAgent Class

For more control, use `ToolLoopAgent` directly:

```typescript
import { ToolLoopAgent, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

const myAgent = new ToolLoopAgent({
    model: openai('gpt-4o'),
    system: 'You are a research assistant.',
    tools: { /* ... */ },
    maxSteps: 20, // Up to 20 steps
});

// Execute with full control
const result = await myAgent.run({
    prompt: 'Research the latest AI developments',
    onStepFinish: ({ stepType, toolCalls }) => {
        console.log(`Step: ${stepType}`);
    },
});
```

### Human-in-the-Loop Tool Approval

AI SDK 6 adds tool approval for sensitive operations:

```typescript
import { agent, tool } from 'ai';

const secureAgent = agent({
    model: openai('gpt-4o'),
    tools: {
        deleteRecord: tool({
            description: 'Delete a database record',
            parameters: z.object({ id: z.string() }),
            // Mark tool as requiring approval
            requiresApproval: true,
            execute: async ({ id }) => {
                await db.records.delete({ where: { id } });
                return { deleted: true };
            },
        }),
    },
    // Handle approval requests
    onToolApprovalRequest: async ({ toolName, args }) => {
        // Show UI to user, wait for approval
        const approved = await showApprovalDialog(toolName, args);
        return approved;
    },
});
```

---

## Core Concepts

### Agent Architecture

```
┌─────────────────────────────────────────────────────┐
│                    AI Agent                         │
├─────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │  Input  │→ │ Reason  │→ │  Act    │→ │ Output │ │
│  └─────────┘  └─────────┘  └─────────┘  └────────┘ │
│       ↑            │            │            │      │
│       │            ↓            ↓            │      │
│  ┌─────────────────────────────────────────────┐   │
│  │              Memory System                   │   │
│  │   (Working Memory + Persistent Storage)     │   │
│  └─────────────────────────────────────────────┘   │
│                      │                              │
│                      ↓                              │
│  ┌─────────────────────────────────────────────┐   │
│  │                 Tools                        │   │
│  │   [API] [Database] [Search] [Code Exec]     │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### The ReAct Pattern

ReAct (Reasoning + Acting) is the foundation of modern AI agents:

1. **Observe** - Receive input and context
2. **Think** - Reason about what action to take
3. **Act** - Execute tool or generate response
4. **Reflect** - Update memory, loop if needed

---

## Tool Calling

### Defining Tools

```typescript
import { tool } from 'ai';
import { z } from 'zod';

const tools = {
    // Database query tool
    queryDatabase: tool({
        description: 'Query the database for user information',
        parameters: z.object({
            userId: z.string().describe('The user ID to look up'),
            fields: z.array(z.string()).optional().describe('Fields to return'),
        }),
        execute: async ({ userId, fields }) => {
            const user = await db.users.findUnique({
                where: { id: userId },
                select: fields?.reduce((acc, f) => ({ ...acc, [f]: true }), {}),
            });
            return user;
        },
    }),

    // API call tool
    sendEmail: tool({
        description: 'Send an email to a user',
        parameters: z.object({
            to: z.string().email(),
            subject: z.string(),
            body: z.string(),
        }),
        execute: async ({ to, subject, body }) => {
            await emailService.send({ to, subject, body });
            return { success: true, sentAt: new Date().toISOString() };
        },
    }),

    // Search tool
    searchWeb: tool({
        description: 'Search the web for information',
        parameters: z.object({
            query: z.string().describe('Search query'),
            limit: z.number().default(5),
        }),
        execute: async ({ query, limit }) => {
            const results = await searchAPI.search(query, { limit });
            return results.map(r => ({ title: r.title, url: r.url, snippet: r.snippet }));
        },
    }),
};
```

### Tool Execution Patterns

```typescript
import { generateText } from 'ai';

// Single-step tool call
const result = await generateText({
    model: openai('gpt-4o'),
    prompt: 'Look up user 123',
    tools,
});

// Multi-step agentic loop
const result = await generateText({
    model: openai('gpt-4o'),
    system: `You are a helpful assistant. Use tools to complete tasks.
             Think step by step. If a tool fails, try an alternative approach.`,
    prompt: userQuery,
    tools,
    maxSteps: 10, // Allow up to 10 reasoning steps
    onStepFinish: ({ stepType, toolCalls, toolResults }) => {
        console.log(`Step: ${stepType}`);
        if (toolCalls) {
            toolCalls.forEach(tc => console.log(`  Tool: ${tc.toolName}`));
        }
    },
});
```

---

## Multi-Step Reasoning

### Agentic Loops with maxSteps

```typescript
const result = await generateText({
    model: openai('gpt-4o'),
    system: `You are a research assistant. Break down complex queries into steps.
             Use available tools to gather information before answering.
             Always verify information from multiple sources when possible.`,
    prompt: 'Compare the market cap of Apple and Microsoft, then analyze which is a better investment',
    tools: {
        getStockData: tool({ /* ... */ }),
        getFinancials: tool({ /* ... */ }),
        getNews: tool({ /* ... */ }),
    },
    maxSteps: 15,
});

// Access the reasoning chain
console.log('Steps taken:', result.steps.length);
for (const step of result.steps) {
    console.log(`- ${step.stepType}: ${step.text?.substring(0, 100) || 'tool call'}`);
}
```

### Chain-of-Thought Prompting

```typescript
const systemPrompt = `You are an expert problem solver. For complex questions:

1. First, break down the problem into smaller parts
2. Think through each part step by step
3. Use tools to gather necessary information
4. Synthesize findings into a coherent answer
5. Verify your reasoning before responding

Always show your reasoning process.`;

const result = await generateText({
    model: openai('gpt-4o'),
    system: systemPrompt,
    prompt: userQuery,
    tools,
    maxSteps: 10,
});
```

### Handling Tool Failures

```typescript
const robustTool = tool({
    description: 'Fetch data with retry logic',
    parameters: z.object({ id: z.string() }),
    execute: async ({ id }, { abortSignal }) => {
        const maxRetries = 3;
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (abortSignal?.aborted) throw new Error('Aborted');

                const data = await fetchData(id);
                return { success: true, data };
            } catch (error) {
                lastError = error as Error;
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, 1000 * attempt)); // Backoff
                }
            }
        }

        return {
            success: false,
            error: lastError?.message || 'Unknown error',
            suggestion: 'Try with a different ID or check if the service is available',
        };
    },
});
```

---

## Streaming

### Basic Streaming

```typescript
import { streamText } from 'ai';

const result = streamText({
    model: openai('gpt-4o'),
    prompt: 'Explain quantum computing',
});

// Stream text chunks
for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
}
```

### Streaming with Tools

```typescript
const result = streamText({
    model: openai('gpt-4o'),
    prompt: 'What is the weather and should I bring an umbrella?',
    tools,
    maxSteps: 5,
    onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta') {
            process.stdout.write(chunk.textDelta);
        }
    },
    onStepFinish: ({ stepType, toolCalls }) => {
        if (stepType === 'tool-result') {
            console.log('\n[Tool executed]');
        }
    },
});

const finalResult = await result.text;
```

### React/Next.js Streaming

```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: openai('gpt-4o'),
        messages,
        tools,
        maxSteps: 10,
    });

    return result.toDataStreamResponse();
}

// components/Chat.tsx
import { useChat } from 'ai/react';

export function Chat() {
    const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
        maxSteps: 10,
        onToolCall: ({ toolCall }) => {
            console.log('Tool called:', toolCall.toolName);
        },
    });

    return (
        <div>
            {messages.map(m => (
                <div key={m.id}>
                    <strong>{m.role}:</strong> {m.content}
                    {m.toolInvocations?.map(ti => (
                        <div key={ti.toolCallId}>Tool: {ti.toolName}</div>
                    ))}
                </div>
            ))}
            <form onSubmit={handleSubmit}>
                <input value={input} onChange={handleInputChange} disabled={isLoading} />
            </form>
        </div>
    );
}
```

---

## Memory Systems

### Working Memory (Conversation Context)

```typescript
interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

class ConversationMemory {
    private messages: Message[] = [];
    private maxMessages: number = 50;

    add(message: Message): void {
        this.messages.push(message);
        // Trim old messages, keep system prompt
        if (this.messages.length > this.maxMessages) {
            const systemMsgs = this.messages.filter(m => m.role === 'system');
            const recentMsgs = this.messages.slice(-this.maxMessages + systemMsgs.length);
            this.messages = [...systemMsgs, ...recentMsgs];
        }
    }

    getMessages(): Message[] {
        return [...this.messages];
    }

    getSummary(): string {
        // Summarize for context compression
        return this.messages.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n');
    }
}
```

### Persistent Memory (Vector Store)

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

class PersistentMemory {
    private vectorStore: VectorStore; // Pinecone, Qdrant, etc.

    async store(content: string, metadata: Record<string, any>): Promise<void> {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: content,
        });

        await this.vectorStore.upsert({
            id: crypto.randomUUID(),
            values: embedding,
            metadata: { content, ...metadata, timestamp: Date.now() },
        });
    }

    async recall(query: string, limit: number = 5): Promise<string[]> {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
        });

        const results = await this.vectorStore.query({
            vector: embedding,
            topK: limit,
            includeMetadata: true,
        });

        return results.matches.map(m => m.metadata.content);
    }
}
```

### Agent with Memory

```typescript
class MemoryAgent {
    private workingMemory: ConversationMemory;
    private persistentMemory: PersistentMemory;

    async run(userInput: string): Promise<string> {
        // Recall relevant past context
        const relevantMemories = await this.persistentMemory.recall(userInput);

        // Build context
        const systemPrompt = `You are a helpful assistant with access to past conversations.

Relevant past context:
${relevantMemories.map(m => `- ${m}`).join('\n')}

Use this context to provide personalized, consistent responses.`;

        this.workingMemory.add({ role: 'user', content: userInput });

        const result = await generateText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages: this.workingMemory.getMessages(),
            tools: this.tools,
            maxSteps: 10,
        });

        const response = result.text;

        // Store in both memories
        this.workingMemory.add({ role: 'assistant', content: response });
        await this.persistentMemory.store(
            `User: ${userInput}\nAssistant: ${response}`,
            { type: 'conversation' }
        );

        return response;
    }
}
```

---

## Multi-Agent Orchestration

### Supervisor Pattern

```typescript
interface Agent {
    name: string;
    description: string;
    run: (input: string) => Promise<string>;
}

class SupervisorAgent {
    private agents: Map<string, Agent> = new Map();

    registerAgent(agent: Agent): void {
        this.agents.set(agent.name, agent);
    }

    async run(userQuery: string): Promise<string> {
        // Step 1: Plan which agents to use
        const planResult = await generateText({
            model: openai('gpt-4o'),
            system: `You are a supervisor that delegates tasks to specialized agents.
Available agents:
${Array.from(this.agents.values()).map(a => `- ${a.name}: ${a.description}`).join('\n')}

Respond with a JSON array of agent names to use in order.`,
            prompt: userQuery,
        });

        const agentPlan = JSON.parse(planResult.text) as string[];

        // Step 2: Execute agents in sequence
        let context = userQuery;
        const results: Record<string, string> = {};

        for (const agentName of agentPlan) {
            const agent = this.agents.get(agentName);
            if (agent) {
                results[agentName] = await agent.run(context);
                context += `\n\n${agentName} result: ${results[agentName]}`;
            }
        }

        // Step 3: Synthesize final response
        const synthesis = await generateText({
            model: openai('gpt-4o'),
            system: 'Synthesize the agent results into a coherent final response.',
            prompt: `Original query: ${userQuery}\n\nAgent results:\n${
                Object.entries(results).map(([k, v]) => `${k}: ${v}`).join('\n\n')
            }`,
        });

        return synthesis.text;
    }
}

// Usage
const supervisor = new SupervisorAgent();

supervisor.registerAgent({
    name: 'researcher',
    description: 'Searches and gathers information from the web',
    run: async (input) => { /* research implementation */ },
});

supervisor.registerAgent({
    name: 'analyst',
    description: 'Analyzes data and provides insights',
    run: async (input) => { /* analysis implementation */ },
});

supervisor.registerAgent({
    name: 'writer',
    description: 'Writes and formats content',
    run: async (input) => { /* writing implementation */ },
});
```

### Parallel Agent Execution

```typescript
class ParallelOrchestrator {
    async runParallel(
        query: string,
        agents: Agent[]
    ): Promise<Record<string, string>> {
        const results = await Promise.all(
            agents.map(async (agent) => ({
                name: agent.name,
                result: await agent.run(query),
            }))
        );

        return results.reduce((acc, { name, result }) => {
            acc[name] = result;
            return acc;
        }, {} as Record<string, string>);
    }
}
```

---

## Production Patterns

### Structured Error Handling

```typescript
class AgentError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly recoverable: boolean = true,
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = 'AgentError';
    }
}

const productionTool = tool({
    description: 'Production-ready tool with error handling',
    parameters: z.object({ input: z.string() }),
    execute: async ({ input }) => {
        try {
            const result = await riskyOperation(input);
            return { success: true, data: result };
        } catch (error) {
            if (error instanceof RateLimitError) {
                return {
                    success: false,
                    error: 'rate_limited',
                    retryAfter: error.retryAfter,
                    suggestion: 'Please wait and try again',
                };
            }
            if (error instanceof ValidationError) {
                return {
                    success: false,
                    error: 'invalid_input',
                    details: error.details,
                    suggestion: 'Check input format and try again',
                };
            }
            // Log unexpected errors
            console.error('Unexpected tool error:', error);
            return {
                success: false,
                error: 'internal_error',
                suggestion: 'Try a different approach or contact support',
            };
        }
    },
});
```

### Timeout and Cancellation

```typescript
import { generateText } from 'ai';

async function runWithTimeout(
    prompt: string,
    timeoutMs: number = 30000
): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const result = await generateText({
            model: openai('gpt-4o'),
            prompt,
            tools,
            maxSteps: 10,
            abortSignal: controller.signal,
        });
        return result.text;
    } finally {
        clearTimeout(timeout);
    }
}
```

### Logging and Observability

```typescript
import { generateText } from 'ai';

const result = await generateText({
    model: openai('gpt-4o'),
    prompt: userQuery,
    tools,
    maxSteps: 10,

    // Step-level logging
    onStepFinish: ({ stepType, toolCalls, toolResults, text, usage }) => {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            stepType,
            toolCalls: toolCalls?.map(tc => tc.toolName),
            textLength: text?.length,
            tokens: usage,
        }));
    },
});

// Final metrics
console.log({
    totalSteps: result.steps.length,
    totalTokens: result.usage,
    finishReason: result.finishReason,
});
```

---

## Gotchas & Real-World Warnings

### Agents Are Expensive

**Token costs explode with multi-step reasoning.** A 10-step agent loop with GPT-4o can cost $0.50-2.00 per user query. Do the math before shipping.

```typescript
// Each step consumes tokens:
// - Full conversation history
// - Tool definitions (can be 1000+ tokens)
// - Tool results
// - Model's reasoning

// 10 steps × 4000 tokens/step = 40,000 tokens = $0.60 with GPT-4o
```

**Streaming doesn't reduce costs.** It improves perceived latency but you pay for every token generated.

### Tools Fail in Production

**APIs have rate limits, timeouts, and outages.** Your demo works perfectly until:
- The weather API returns 429 Too Many Requests
- The database query takes 30 seconds
- The third-party service is down for maintenance

```typescript
// DANGER: Tool assumes success
execute: async ({ query }) => {
  const result = await searchAPI.search(query);
  return result;
}

// BETTER: Defensive execution
execute: async ({ query }) => {
  try {
    const result = await searchAPI.search(query, { timeout: 5000 });
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      suggestion: 'Try a different search term or check back later',
    };
  }
}
```

### Agent Loops Can Go Wrong

**Infinite loops are real.** Without proper stop conditions:
- Agent keeps calling tools that return errors
- Agent gets stuck in circular reasoning
- Agent exhausts your API budget at 3 AM

**Model behavior is non-deterministic.** Same prompt, different results. Your agent might:
- Decide to call 5 tools when 1 would suffice
- Skip important steps unpredictably
- Hallucinate tool names that don't exist

### Memory Systems Are Hard

**Vector search isn't magic.** Semantic similarity != relevance. Your agent recalls:
- "The weather is nice" when user asks about "nice restaurants"
- Year-old conversations instead of recent context
- Irrelevant memories that confuse the model

**Context windows fill up.** 128K tokens sounds like a lot until your agent has:
- 50 messages of conversation history
- 10 tool definitions with examples
- Retrieved memories from vector store
- Current tool results

### What These Patterns Don't Tell You

1. **Cost monitoring** - Set up alerts before your bill surprises you
2. **Rate limiting users** - One user can drain your budget
3. **Prompt injection** - Users can manipulate agent behavior
4. **Compliance** - Logging conversations may have legal implications
5. **Evaluation** - How do you know if your agent is actually good?
6. **Fallbacks** - What happens when the AI provider is down?

---

## Anti-Patterns to Avoid

- **No maxSteps limit** - Agent loops forever
- **Unbounded context** - Memory grows until token limit
- **Silent tool failures** - Always return structured error responses
- **No timeout** - Agent hangs on slow tools
- **Hardcoded prompts** - Use configurable system prompts
- **Missing logging** - Can't debug production issues
- **Synchronous heavy tools** - Block the event loop

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Implement tool calling | [tool-calling.md](resources/tool-calling.md) |
| Build agentic loops | [agentic-patterns.md](resources/agentic-patterns.md) |
| Add memory systems | [memory-systems.md](resources/memory-systems.md) |
| Orchestrate multi-agent | [multi-agent.md](resources/multi-agent.md) |
| Production hardening | [production-patterns.md](resources/production-patterns.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [tool-calling.md](resources/tool-calling.md)
Tool definition, parameters, execution, error handling, async patterns

### [agentic-patterns.md](resources/agentic-patterns.md)
ReAct loops, chain-of-thought, planning, step callbacks, reasoning traces

### [memory-systems.md](resources/memory-systems.md)
Working memory, persistent storage, vector DBs, context compression

### [multi-agent.md](resources/multi-agent.md)
Supervisor pattern, parallel execution, agent handoffs, hierarchical systems

### [production-patterns.md](resources/production-patterns.md)
Error handling, retries, timeouts, logging, monitoring, security

### [complete-examples.md](resources/complete-examples.md)
Full agent implementations: support bot, research agent, workflow automation

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 6 resource files
