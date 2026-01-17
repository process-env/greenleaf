# Multi-Agent Orchestration

## Supervisor Pattern

### Basic Supervisor

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

interface AgentConfig {
    name: string;
    description: string;
    systemPrompt: string;
    tools?: Record<string, any>;
}

class Supervisor {
    private agents: Map<string, AgentConfig> = new Map();

    register(config: AgentConfig): void {
        this.agents.set(config.name, config);
    }

    private async delegateToAgent(name: string, task: string): Promise<string> {
        const agent = this.agents.get(name);
        if (!agent) throw new Error(`Agent ${name} not found`);

        const result = await generateText({
            model: openai('gpt-4o'),
            system: agent.systemPrompt,
            prompt: task,
            tools: agent.tools,
            maxSteps: 10,
        });

        return result.text;
    }

    async run(query: string): Promise<{ plan: string[]; results: Record<string, string>; answer: string }> {
        // Create delegation tool
        const delegateTool = tool({
            description: 'Delegate a task to a specialized agent',
            parameters: z.object({
                agentName: z.enum(Array.from(this.agents.keys()) as [string, ...string[]]),
                task: z.string().describe('The specific task for the agent'),
            }),
            execute: async ({ agentName, task }) => {
                return await this.delegateToAgent(agentName, task);
            },
        });

        const agentDescriptions = Array.from(this.agents.entries())
            .map(([name, config]) => `- ${name}: ${config.description}`)
            .join('\n');

        const result = await generateText({
            model: openai('gpt-4o'),
            system: `You are a supervisor that coordinates specialized agents to complete tasks.

Available agents:
${agentDescriptions}

Delegate subtasks to appropriate agents and synthesize their outputs into a final answer.
Think carefully about which agent is best suited for each part of the task.`,
            prompt: query,
            tools: { delegate: delegateTool },
            maxSteps: 20,
        });

        // Extract delegation history from steps
        const delegations = result.steps
            .filter(s => s.toolCalls)
            .flatMap(s => s.toolCalls || [])
            .map(tc => tc.args as { agentName: string; task: string });

        return {
            plan: delegations.map(d => `${d.agentName}: ${d.task}`),
            results: {}, // Could extract from tool results
            answer: result.text,
        };
    }
}

// Usage
const supervisor = new Supervisor();

supervisor.register({
    name: 'researcher',
    description: 'Searches the web and gathers information on topics',
    systemPrompt: 'You are a research specialist. Search thoroughly and cite sources.',
    tools: { search: searchTool, fetch: fetchTool },
});

supervisor.register({
    name: 'analyst',
    description: 'Analyzes data and provides insights',
    systemPrompt: 'You are a data analyst. Provide clear, quantitative analysis.',
    tools: { calculate: calcTool, chart: chartTool },
});

supervisor.register({
    name: 'writer',
    description: 'Writes and formats professional content',
    systemPrompt: 'You are a professional writer. Create clear, engaging content.',
});

const result = await supervisor.run('Research AI agent market trends and write a report');
```

---

## Parallel Execution

### Concurrent Agent Workers

```typescript
class ParallelAgentPool {
    private agents: AgentConfig[];

    constructor(agents: AgentConfig[]) {
        this.agents = agents;
    }

    async runAll(query: string): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        await Promise.all(
            this.agents.map(async (agent) => {
                const result = await generateText({
                    model: openai('gpt-4o'),
                    system: agent.systemPrompt,
                    prompt: query,
                    tools: agent.tools,
                    maxSteps: 5,
                });
                results.set(agent.name, result.text);
            })
        );

        return results;
    }

    async runWithConsensus(query: string): Promise<string> {
        const results = await this.runAll(query);

        // Synthesize results
        const synthesis = await generateText({
            model: openai('gpt-4o'),
            system: 'Synthesize these different perspectives into a balanced answer.',
            prompt: `Query: ${query}

Perspectives:
${Array.from(results.entries()).map(([name, result]) => `${name}: ${result}`).join('\n\n')}

Provide a synthesized answer:`,
        });

        return synthesis.text;
    }
}

// Usage: Get multiple perspectives simultaneously
const pool = new ParallelAgentPool([
    { name: 'optimist', systemPrompt: 'Focus on opportunities and positive outcomes.', description: '' },
    { name: 'skeptic', systemPrompt: 'Question assumptions and identify risks.', description: '' },
    { name: 'pragmatist', systemPrompt: 'Focus on practical, actionable advice.', description: '' },
]);

const balanced = await pool.runWithConsensus('Should we invest in AI infrastructure?');
```

---

## Hierarchical Systems

### Three-Tier Architecture

```typescript
class HierarchicalSystem {
    // Tier 1: Strategic (high-level planning)
    private strategist = {
        systemPrompt: `You are a strategic planner. Break down complex goals into phases.
Output JSON: { phases: [{ name, objective, successCriteria }] }`,
    };

    // Tier 2: Tactical (coordination)
    private coordinators: Map<string, AgentConfig> = new Map();

    // Tier 3: Operational (execution)
    private workers: Map<string, AgentConfig> = new Map();

    async execute(goal: string): Promise<any> {
        // Strategic planning
        const strategy = await generateText({
            model: openai('gpt-4o'),
            system: this.strategist.systemPrompt,
            prompt: goal,
        });
        const phases = JSON.parse(strategy.text).phases;

        const results = [];

        for (const phase of phases) {
            console.log(`Phase: ${phase.name}`);

            // Tactical coordination
            const tasks = await this.planPhase(phase);

            // Operational execution
            const phaseResults = await Promise.all(
                tasks.map(task => this.executeTask(task))
            );

            results.push({ phase: phase.name, results: phaseResults });
        }

        return results;
    }

    private async planPhase(phase: any): Promise<any[]> {
        const result = await generateText({
            model: openai('gpt-4o'),
            system: 'Break this phase into specific executable tasks. Output JSON array.',
            prompt: JSON.stringify(phase),
        });
        return JSON.parse(result.text);
    }

    private async executeTask(task: any): Promise<string> {
        const result = await generateText({
            model: openai('gpt-4o'),
            system: 'Execute this specific task.',
            prompt: JSON.stringify(task),
            tools: this.getToolsForTask(task),
            maxSteps: 5,
        });
        return result.text;
    }

    private getToolsForTask(task: any): Record<string, any> {
        // Return appropriate tools based on task type
        return {};
    }
}
```

---

## Agent Communication

### Message Passing

```typescript
interface AgentMessage {
    from: string;
    to: string;
    type: 'request' | 'response' | 'broadcast';
    content: any;
    timestamp: number;
}

class MessageBus {
    private handlers: Map<string, (msg: AgentMessage) => Promise<void>> = new Map();
    private messageLog: AgentMessage[] = [];

    register(agentName: string, handler: (msg: AgentMessage) => Promise<void>): void {
        this.handlers.set(agentName, handler);
    }

    async send(message: Omit<AgentMessage, 'timestamp'>): Promise<void> {
        const fullMessage = { ...message, timestamp: Date.now() };
        this.messageLog.push(fullMessage);

        if (message.type === 'broadcast') {
            await Promise.all(
                Array.from(this.handlers.entries())
                    .filter(([name]) => name !== message.from)
                    .map(([_, handler]) => handler(fullMessage))
            );
        } else {
            const handler = this.handlers.get(message.to);
            if (handler) await handler(fullMessage);
        }
    }

    getHistory(agentName?: string): AgentMessage[] {
        if (!agentName) return this.messageLog;
        return this.messageLog.filter(m => m.from === agentName || m.to === agentName);
    }
}

// Usage
const bus = new MessageBus();

bus.register('researcher', async (msg) => {
    if (msg.type === 'request' && msg.content.action === 'search') {
        const results = await searchAPI(msg.content.query);
        await bus.send({
            from: 'researcher',
            to: msg.from,
            type: 'response',
            content: { results },
        });
    }
});
```

### Shared Blackboard

```typescript
class Blackboard {
    private state: Record<string, any> = {};
    private subscribers: Map<string, (key: string, value: any) => void> = new Map();

    write(key: string, value: any, author: string): void {
        this.state[key] = { value, author, timestamp: Date.now() };

        // Notify subscribers
        this.subscribers.forEach((callback) => callback(key, value));
    }

    read(key: string): any {
        return this.state[key]?.value;
    }

    subscribe(agentName: string, callback: (key: string, value: any) => void): void {
        this.subscribers.set(agentName, callback);
    }

    getAll(): Record<string, any> {
        return Object.fromEntries(
            Object.entries(this.state).map(([k, v]) => [k, v.value])
        );
    }
}

// Usage with agents
const blackboard = new Blackboard();

// Research agent writes findings
blackboard.write('market_data', { trends: [...], sources: [...] }, 'researcher');

// Analyst agent reads and writes analysis
const data = blackboard.read('market_data');
const analysis = await analyzeData(data);
blackboard.write('market_analysis', analysis, 'analyst');

// Writer agent reads all and generates report
const allData = blackboard.getAll();
const report = await generateReport(allData);
```

---

## Agent Handoffs

### Explicit Handoff

```typescript
const handoffTool = tool({
    description: 'Hand off the conversation to another specialized agent',
    parameters: z.object({
        targetAgent: z.enum(['support', 'sales', 'technical', 'billing']),
        reason: z.string().describe('Why this handoff is needed'),
        context: z.string().describe('Relevant context for the next agent'),
    }),
    execute: async ({ targetAgent, reason, context }) => {
        // In production, this would route to the appropriate agent
        return {
            handoffComplete: true,
            targetAgent,
            message: `Transferring to ${targetAgent} agent. Reason: ${reason}`,
        };
    },
});

const triageAgent = async (userMessage: string) => {
    return await generateText({
        model: openai('gpt-4o'),
        system: `You are a triage agent. Analyze user requests and either:
1. Answer simple questions directly
2. Hand off to specialized agents for complex issues

Available specialists:
- support: General customer support
- sales: Pricing, plans, upgrades
- technical: Technical issues, bugs, API
- billing: Invoices, payments, refunds`,
        prompt: userMessage,
        tools: { handoff: handoffTool },
        maxSteps: 3,
    });
};
```

### Seamless Handoff with Context

```typescript
interface ConversationContext {
    messages: Message[];
    metadata: Record<string, any>;
    currentAgent: string;
}

class ConversationManager {
    private context: ConversationContext;
    private agents: Map<string, AgentConfig>;

    async processMessage(userMessage: string): Promise<string> {
        this.context.messages.push({ role: 'user', content: userMessage });

        const agent = this.agents.get(this.context.currentAgent)!;

        const result = await generateText({
            model: openai('gpt-4o'),
            system: `${agent.systemPrompt}

Conversation context: ${JSON.stringify(this.context.metadata)}`,
            messages: this.context.messages,
            tools: {
                ...agent.tools,
                transferTo: tool({
                    description: 'Transfer to another agent',
                    parameters: z.object({
                        agent: z.string(),
                        summary: z.string(),
                    }),
                    execute: async ({ agent, summary }) => {
                        this.context.currentAgent = agent;
                        this.context.metadata.transferSummary = summary;
                        return { transferred: true };
                    },
                }),
            },
            maxSteps: 10,
        });

        this.context.messages.push({ role: 'assistant', content: result.text });

        return result.text;
    }
}
```

---

## Debate and Consensus

### Agent Debate

```typescript
const debateSystem = async (topic: string) => {
    const positions = ['pro', 'con'];
    const rounds = 3;
    const debate: Array<{ position: string; argument: string }> = [];

    for (let round = 0; round < rounds; round++) {
        for (const position of positions) {
            const previousArguments = debate
                .map(d => `${d.position}: ${d.argument}`)
                .join('\n\n');

            const result = await generateText({
                model: openai('gpt-4o'),
                system: `You are arguing ${position} the topic. Be persuasive but fair.
${previousArguments ? `\nPrevious arguments:\n${previousArguments}` : ''}`,
                prompt: `Topic: ${topic}\n\nPresent your ${position} argument for round ${round + 1}:`,
            });

            debate.push({ position, argument: result.text });
        }
    }

    // Judge evaluates
    const judgment = await generateText({
        model: openai('gpt-4o'),
        system: 'You are an impartial judge. Evaluate the debate fairly.',
        prompt: `Topic: ${topic}\n\nDebate:\n${debate.map(d => `${d.position}: ${d.argument}`).join('\n\n')}\n\nProvide your judgment:`,
    });

    return { debate, judgment: judgment.text };
};
```
