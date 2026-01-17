# Complete Examples

## Customer Support Agent

Full implementation of a production support agent with memory and escalation.

```typescript
import { generateText, streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

// Types
interface Ticket {
    id: string;
    userId: string;
    status: 'open' | 'pending' | 'resolved' | 'escalated';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    messages: Array<{ role: string; content: string; timestamp: Date }>;
}

// Tools
const supportTools = {
    lookupUser: tool({
        description: 'Look up customer information by ID or email',
        parameters: z.object({
            identifier: z.string().describe('User ID or email address'),
        }),
        execute: async ({ identifier }) => {
            const user = await db.users.findFirst({
                where: {
                    OR: [{ id: identifier }, { email: identifier }],
                },
                include: { orders: { take: 5 }, subscriptions: true },
            });
            return user || { error: 'User not found' };
        },
    }),

    lookupOrder: tool({
        description: 'Get order details and status',
        parameters: z.object({
            orderId: z.string(),
        }),
        execute: async ({ orderId }) => {
            return await db.orders.findUnique({
                where: { id: orderId },
                include: { items: true, shipment: true },
            });
        },
    }),

    initiateRefund: tool({
        description: 'Start a refund process for an order',
        parameters: z.object({
            orderId: z.string(),
            reason: z.string(),
            amount: z.number().optional().describe('Partial refund amount, omit for full refund'),
        }),
        execute: async ({ orderId, reason, amount }) => {
            // Verify order exists and is refundable
            const order = await db.orders.findUnique({ where: { id: orderId } });
            if (!order) return { error: 'Order not found' };
            if (order.refundedAt) return { error: 'Order already refunded' };

            const refund = await paymentService.initiateRefund({
                orderId,
                amount: amount || order.total,
                reason,
            });

            return { success: true, refundId: refund.id, amount: refund.amount };
        },
    }),

    updateTicket: tool({
        description: 'Update ticket status or priority',
        parameters: z.object({
            ticketId: z.string(),
            status: z.enum(['open', 'pending', 'resolved', 'escalated']).optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
            internalNote: z.string().optional(),
        }),
        execute: async ({ ticketId, status, priority, internalNote }) => {
            return await db.tickets.update({
                where: { id: ticketId },
                data: { status, priority, internalNote },
            });
        },
    }),

    escalateToHuman: tool({
        description: 'Escalate to human agent when unable to resolve or customer requests',
        parameters: z.object({
            ticketId: z.string(),
            reason: z.string(),
            summary: z.string().describe('Summary of the issue and what was tried'),
            suggestedTeam: z.enum(['billing', 'technical', 'account', 'general']),
        }),
        execute: async ({ ticketId, reason, summary, suggestedTeam }) => {
            await db.tickets.update({
                where: { id: ticketId },
                data: {
                    status: 'escalated',
                    escalationReason: reason,
                    escalationSummary: summary,
                    assignedTeam: suggestedTeam,
                },
            });

            await notificationService.notifyTeam(suggestedTeam, {
                ticketId,
                reason,
                summary,
            });

            return { escalated: true, team: suggestedTeam };
        },
    }),

    searchKnowledgeBase: tool({
        description: 'Search help articles and documentation',
        parameters: z.object({
            query: z.string(),
        }),
        execute: async ({ query }) => {
            const results = await knowledgeBase.search(query, { limit: 3 });
            return results.map(r => ({
                title: r.title,
                excerpt: r.excerpt,
                url: r.url,
            }));
        },
    }),
};

// Agent
class SupportAgent {
    private systemPrompt = `You are a friendly and efficient customer support agent for TechCorp.

Your capabilities:
- Look up customer accounts and order history
- Process refunds for eligible orders
- Search the knowledge base for answers
- Escalate complex issues to human agents

Guidelines:
1. Always verify the customer's identity before discussing account details
2. Be empathetic and professional
3. Try to resolve issues on first contact when possible
4. If you can't resolve an issue after 2-3 attempts, offer to escalate
5. Never make promises you can't keep
6. Cite knowledge base articles when relevant

Current ticket ID: {{ticketId}}
Customer ID: {{customerId}}`;

    async handleMessage(
        ticketId: string,
        customerId: string,
        message: string
    ): Promise<AsyncIterable<string>> {
        const ticket = await db.tickets.findUnique({
            where: { id: ticketId },
            include: { messages: { take: 20 } },
        });

        const systemPrompt = this.systemPrompt
            .replace('{{ticketId}}', ticketId)
            .replace('{{customerId}}', customerId);

        const messages = [
            ...ticket!.messages.map(m => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
            { role: 'user' as const, content: message },
        ];

        const result = streamText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            messages,
            tools: supportTools,
            maxSteps: 10,
            onStepFinish: async ({ toolCalls }) => {
                // Log tool usage for analytics
                if (toolCalls) {
                    await analytics.track('support_tool_used', {
                        ticketId,
                        tools: toolCalls.map(tc => tc.toolName),
                    });
                }
            },
        });

        return result.textStream;
    }
}
```

---

## Research Agent

Autonomous research agent that gathers and synthesizes information.

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

interface ResearchReport {
    query: string;
    summary: string;
    findings: Array<{
        topic: string;
        content: string;
        sources: string[];
        confidence: 'high' | 'medium' | 'low';
    }>;
    sources: Array<{ url: string; title: string; relevance: number }>;
    methodology: string;
    limitations: string[];
}

const researchTools = {
    webSearch: tool({
        description: 'Search the web for information',
        parameters: z.object({
            query: z.string(),
            timeframe: z.enum(['day', 'week', 'month', 'year', 'any']).default('any'),
        }),
        execute: async ({ query, timeframe }) => {
            const results = await searchAPI.search(query, { timeframe, limit: 10 });
            return results.map(r => ({
                title: r.title,
                url: r.url,
                snippet: r.snippet,
                date: r.publishedDate,
            }));
        },
    }),

    fetchPage: tool({
        description: 'Fetch and extract content from a URL',
        parameters: z.object({
            url: z.string().url(),
        }),
        execute: async ({ url }) => {
            const content = await scraper.fetch(url);
            return {
                title: content.title,
                text: content.text.substring(0, 5000), // Limit content
                author: content.author,
                date: content.publishedDate,
            };
        },
    }),

    academicSearch: tool({
        description: 'Search academic papers and research',
        parameters: z.object({
            query: z.string(),
            yearFrom: z.number().optional(),
        }),
        execute: async ({ query, yearFrom }) => {
            const papers = await semanticScholar.search(query, { yearFrom, limit: 5 });
            return papers.map(p => ({
                title: p.title,
                authors: p.authors.map(a => a.name),
                year: p.year,
                abstract: p.abstract,
                citationCount: p.citationCount,
                url: p.url,
            }));
        },
    }),

    saveNote: tool({
        description: 'Save a research note for later synthesis',
        parameters: z.object({
            topic: z.string(),
            content: z.string(),
            source: z.string(),
            confidence: z.enum(['high', 'medium', 'low']),
        }),
        execute: async ({ topic, content, source, confidence }) => {
            // Store in research session
            return { saved: true, topic };
        },
    }),
};

class ResearchAgent {
    private notes: Array<{ topic: string; content: string; source: string; confidence: string }> = [];
    private sources: Map<string, { url: string; title: string; relevance: number }> = new Map();

    async research(query: string, depth: 'quick' | 'standard' | 'deep' = 'standard'): Promise<ResearchReport> {
        const maxSteps = depth === 'quick' ? 5 : depth === 'standard' ? 15 : 30;

        const systemPrompt = `You are an expert research analyst. Your task is to thoroughly research a topic.

Research methodology:
1. Start with broad web searches to understand the landscape
2. Identify authoritative sources and academic research
3. Fetch and analyze key documents
4. Save important findings as notes
5. Cross-reference information from multiple sources
6. Assess confidence levels based on source quality and agreement

For each piece of information, evaluate:
- Source credibility
- Recency of information
- Agreement with other sources

Current research query: "${query}"
Depth level: ${depth}`;

        // Wrap tools to capture notes and sources
        const wrappedTools = {
            ...researchTools,
            saveNote: tool({
                ...researchTools.saveNote,
                execute: async (params) => {
                    this.notes.push(params);
                    return { saved: true, topic: params.topic };
                },
            }),
        };

        await generateText({
            model: openai('gpt-4o'),
            system: systemPrompt,
            prompt: `Begin researching: ${query}`,
            tools: wrappedTools,
            maxSteps,
        });

        // Synthesize findings
        return await this.synthesize(query);
    }

    private async synthesize(query: string): Promise<ResearchReport> {
        const synthesisPrompt = `Synthesize these research notes into a comprehensive report.

Notes:
${this.notes.map(n => `[${n.topic}] (${n.confidence}): ${n.content} (Source: ${n.source})`).join('\n\n')}

Create a structured report with:
1. Executive summary
2. Key findings organized by topic
3. Source quality assessment
4. Limitations and gaps
5. Recommendations for further research`;

        const result = await generateText({
            model: openai('gpt-4o'),
            system: 'You are a research report synthesizer. Create clear, well-structured reports.',
            prompt: synthesisPrompt,
        });

        // Parse into structured format
        const report: ResearchReport = {
            query,
            summary: result.text.split('\n\n')[0],
            findings: this.notes.map(n => ({
                topic: n.topic,
                content: n.content,
                sources: [n.source],
                confidence: n.confidence as 'high' | 'medium' | 'low',
            })),
            sources: Array.from(this.sources.values()),
            methodology: `Depth: standard, Steps taken: ${this.notes.length} notes collected`,
            limitations: ['Time-bounded search', 'Web sources may have bias'],
        };

        return report;
    }
}

// Usage
const agent = new ResearchAgent();
const report = await agent.research(
    'Impact of AI on software development productivity in 2024-2025',
    'deep'
);
console.log(report);
```

---

## Workflow Automation Agent

Agent that orchestrates complex multi-step business workflows.

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

interface WorkflowStep {
    id: string;
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    result?: any;
    error?: string;
}

interface Workflow {
    id: string;
    name: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    steps: WorkflowStep[];
    context: Record<string, any>;
}

const workflowTools = {
    createTask: tool({
        description: 'Create a task in the project management system',
        parameters: z.object({
            title: z.string(),
            description: z.string(),
            assignee: z.string().optional(),
            dueDate: z.string().optional(),
            priority: z.enum(['low', 'medium', 'high', 'urgent']),
            labels: z.array(z.string()).optional(),
        }),
        execute: async (params) => {
            const task = await projectManager.createTask(params);
            return { taskId: task.id, url: task.url };
        },
    }),

    sendNotification: tool({
        description: 'Send a notification to a user or channel',
        parameters: z.object({
            channel: z.enum(['email', 'slack', 'teams']),
            recipient: z.string(),
            subject: z.string(),
            message: z.string(),
            urgent: z.boolean().default(false),
        }),
        execute: async (params) => {
            await notificationService.send(params);
            return { sent: true };
        },
    }),

    queryDatabase: tool({
        description: 'Query the database for information',
        parameters: z.object({
            collection: z.string(),
            filter: z.record(z.any()),
            limit: z.number().default(10),
        }),
        execute: async ({ collection, filter, limit }) => {
            return await db[collection].findMany({ where: filter, take: limit });
        },
    }),

    updateRecord: tool({
        description: 'Update a record in the database',
        parameters: z.object({
            collection: z.string(),
            id: z.string(),
            data: z.record(z.any()),
        }),
        execute: async ({ collection, id, data }) => {
            return await db[collection].update({ where: { id }, data });
        },
    }),

    callAPI: tool({
        description: 'Call an external API',
        parameters: z.object({
            service: z.enum(['salesforce', 'hubspot', 'stripe', 'twilio']),
            action: z.string(),
            params: z.record(z.any()),
        }),
        execute: async ({ service, action, params }) => {
            const client = integrations[service];
            return await client[action](params);
        },
    }),

    pauseWorkflow: tool({
        description: 'Pause workflow for human approval',
        parameters: z.object({
            reason: z.string(),
            approvers: z.array(z.string()),
            timeout: z.string().describe('e.g., "24h", "7d"'),
        }),
        execute: async ({ reason, approvers, timeout }) => {
            // This would create an approval request
            return { paused: true, approvalId: crypto.randomUUID() };
        },
    }),

    logStep: tool({
        description: 'Log workflow progress',
        parameters: z.object({
            stepName: z.string(),
            status: z.enum(['started', 'completed', 'failed']),
            details: z.string().optional(),
        }),
        execute: async (params) => {
            console.log(`[Workflow] ${params.stepName}: ${params.status}`);
            return { logged: true };
        },
    }),
};

class WorkflowAgent {
    private workflow: Workflow;

    constructor(workflowName: string) {
        this.workflow = {
            id: crypto.randomUUID(),
            name: workflowName,
            status: 'running',
            steps: [],
            context: {},
        };
    }

    async execute(instruction: string, context: Record<string, any> = {}): Promise<Workflow> {
        this.workflow.context = context;

        const systemPrompt = `You are a workflow automation agent. Execute the given workflow step by step.

Current workflow: ${this.workflow.name}
Context: ${JSON.stringify(context)}

Guidelines:
1. Break down complex tasks into discrete steps
2. Log each step as you complete it
3. Handle errors gracefully - try alternatives or pause for human intervention
4. Verify results before proceeding to next step
5. If unsure about a destructive action, pause for approval

Execute the workflow efficiently and safely.`;

        try {
            const result = await generateText({
                model: openai('gpt-4o'),
                system: systemPrompt,
                prompt: instruction,
                tools: workflowTools,
                maxSteps: 50,
                onStepFinish: ({ toolCalls, toolResults }) => {
                    if (toolCalls) {
                        for (let i = 0; i < toolCalls.length; i++) {
                            const call = toolCalls[i];
                            const result = toolResults?.[i];

                            this.workflow.steps.push({
                                id: crypto.randomUUID(),
                                name: call.toolName,
                                status: result?.result?.error ? 'failed' : 'completed',
                                result: result?.result,
                            });
                        }
                    }
                },
            });

            this.workflow.status = 'completed';
            this.workflow.context.finalResult = result.text;
        } catch (error) {
            this.workflow.status = 'failed';
            this.workflow.context.error = (error as Error).message;
        }

        return this.workflow;
    }
}

// Usage
const agent = new WorkflowAgent('New Customer Onboarding');

const workflow = await agent.execute(
    `Onboard new customer:
1. Create a welcome task for the account manager
2. Send welcome email to the customer
3. Create initial project in project management system
4. Set up billing in Stripe
5. Send Slack notification to the team
6. Update CRM record with onboarding status`,
    {
        customerId: 'cust_123',
        customerEmail: 'customer@example.com',
        accountManager: 'am@company.com',
        plan: 'enterprise',
    }
);

console.log('Workflow completed:', workflow);
```
