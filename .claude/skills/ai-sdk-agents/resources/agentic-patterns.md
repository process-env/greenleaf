# Agentic Patterns

## ReAct Implementation

### Basic ReAct Loop

```typescript
import { generateText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

const reactAgent = async (query: string) => {
    const systemPrompt = `You are an AI assistant that follows the ReAct pattern:
1. THOUGHT: Analyze what you need to do
2. ACTION: Use a tool if needed
3. OBSERVATION: Review the tool result
4. Repeat until you can provide a final answer

Always think step by step. If unsure, gather more information first.`;

    const result = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: query,
        tools: {
            search: tool({
                description: 'Search for information',
                parameters: z.object({ query: z.string() }),
                execute: async ({ query }) => await searchAPI(query),
            }),
            calculate: tool({
                description: 'Perform mathematical calculations',
                parameters: z.object({ expression: z.string() }),
                execute: async ({ expression }) => eval(expression), // Use proper math parser in production
            }),
            lookup: tool({
                description: 'Look up specific data',
                parameters: z.object({ key: z.string() }),
                execute: async ({ key }) => await database.get(key),
            }),
        },
        maxSteps: 10,
        onStepFinish: ({ stepType, text, toolCalls }) => {
            if (stepType === 'text-delta' && text) {
                console.log('THOUGHT:', text);
            }
            if (toolCalls) {
                console.log('ACTION:', toolCalls.map(t => t.toolName).join(', '));
            }
        },
    });

    return {
        answer: result.text,
        steps: result.steps,
        reasoning: result.steps.map(s => s.text).filter(Boolean),
    };
};
```

### ReAct with Explicit Reasoning

```typescript
const explicitReactAgent = async (query: string) => {
    const systemPrompt = `You are a reasoning agent. For each step, structure your response as:

THOUGHT: [Your reasoning about what to do next]
ACTION: [The tool to use, or "FINAL" if ready to answer]
ACTION_INPUT: [Input for the tool, or your final answer]

Be thorough and consider multiple approaches.`;

    const result = await generateText({
        model: openai('gpt-4o'),
        system: systemPrompt,
        prompt: `Question: ${query}\n\nBegin your reasoning:`,
        tools,
        maxSteps: 15,
    });

    // Parse reasoning trace
    const reasoningTrace = result.steps
        .filter(s => s.text)
        .map(s => {
            const thoughtMatch = s.text?.match(/THOUGHT:\s*(.+?)(?=ACTION:|$)/s);
            const actionMatch = s.text?.match(/ACTION:\s*(.+?)(?=ACTION_INPUT:|$)/s);
            return {
                thought: thoughtMatch?.[1]?.trim(),
                action: actionMatch?.[1]?.trim(),
            };
        });

    return { answer: result.text, reasoningTrace };
};
```

---

## Planning Patterns

### Plan-then-Execute

```typescript
interface Plan {
    steps: Array<{
        description: string;
        tool: string;
        expectedOutput: string;
    }>;
}

const planningAgent = async (query: string) => {
    // Step 1: Create a plan
    const planResult = await generateText({
        model: openai('gpt-4o'),
        system: `You are a planning agent. Given a query, create a detailed plan.
Output a JSON object with steps array. Each step has: description, tool, expectedOutput.
Available tools: search, calculate, lookup, summarize`,
        prompt: query,
    });

    const plan = JSON.parse(planResult.text) as Plan;
    console.log('Plan created:', plan.steps.length, 'steps');

    // Step 2: Execute the plan
    const results: Record<string, any> = {};

    for (const step of plan.steps) {
        console.log(`Executing: ${step.description}`);

        const stepResult = await generateText({
            model: openai('gpt-4o'),
            system: `Execute this step: ${step.description}
Previous results: ${JSON.stringify(results)}`,
            prompt: `Use the ${step.tool} tool to accomplish this step.`,
            tools,
            maxSteps: 3,
        });

        results[step.description] = stepResult.text;
    }

    // Step 3: Synthesize final answer
    const finalResult = await generateText({
        model: openai('gpt-4o'),
        system: 'Synthesize the execution results into a final answer.',
        prompt: `Original query: ${query}\n\nExecution results:\n${JSON.stringify(results, null, 2)}`,
    });

    return { plan, results, answer: finalResult.text };
};
```

### Adaptive Re-planning

```typescript
const adaptiveAgent = async (query: string) => {
    let plan = await createPlan(query);
    let currentStep = 0;
    const results: any[] = [];

    while (currentStep < plan.steps.length) {
        const step = plan.steps[currentStep];

        try {
            const result = await executeStep(step);
            results.push({ step, result, success: true });
            currentStep++;
        } catch (error) {
            // Re-plan on failure
            const newPlan = await generateText({
                model: openai('gpt-4o'),
                system: `A step failed. Create a new plan to recover.
Original query: ${query}
Completed steps: ${JSON.stringify(results)}
Failed step: ${JSON.stringify(step)}
Error: ${error}`,
                prompt: 'Create a revised plan to complete the task.',
            });

            plan = JSON.parse(newPlan.text);
            currentStep = 0; // Restart with new plan
        }
    }

    return synthesizeResults(query, results);
};
```

---

## Chain-of-Thought Patterns

### Zero-Shot CoT

```typescript
const zeroShotCoT = async (query: string) => {
    return await generateText({
        model: openai('gpt-4o'),
        prompt: `${query}

Let's think through this step by step:`,
        tools,
        maxSteps: 10,
    });
};
```

### Few-Shot CoT

```typescript
const fewShotCoT = async (query: string) => {
    const examples = `
Example 1:
Question: What is 15% of 80?
Let's think step by step:
1. 15% means 15/100 = 0.15
2. Multiply: 0.15 × 80 = 12
Answer: 12

Example 2:
Question: If a train travels 120 miles in 2 hours, what is its speed?
Let's think step by step:
1. Speed = Distance / Time
2. Speed = 120 miles / 2 hours
3. Speed = 60 miles per hour
Answer: 60 mph
`;

    return await generateText({
        model: openai('gpt-4o'),
        system: examples,
        prompt: `Question: ${query}\nLet's think step by step:`,
    });
};
```

### Self-Consistency CoT

```typescript
const selfConsistencyCoT = async (query: string, samples: number = 5) => {
    // Generate multiple reasoning paths
    const responses = await Promise.all(
        Array(samples).fill(null).map(() =>
            generateText({
                model: openai('gpt-4o'),
                prompt: `${query}\n\nLet's solve this step by step:`,
                temperature: 0.7, // Higher temp for diversity
            })
        )
    );

    // Extract final answers
    const answers = responses.map(r => {
        const match = r.text.match(/(?:answer|result|therefore)[:\s]+(.+?)(?:\.|$)/i);
        return match?.[1]?.trim() || r.text.split('\n').pop();
    });

    // Find most common answer (majority vote)
    const answerCounts = answers.reduce((acc, ans) => {
        acc[ans] = (acc[ans] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const majorityAnswer = Object.entries(answerCounts)
        .sort((a, b) => b[1] - a[1])[0][0];

    return {
        answer: majorityAnswer,
        confidence: answerCounts[majorityAnswer] / samples,
        allPaths: responses.map(r => r.text),
    };
};
```

---

## Step Callbacks and Traces

### Comprehensive Step Logging

```typescript
interface StepLog {
    stepNumber: number;
    type: string;
    timestamp: number;
    duration?: number;
    content?: string;
    toolCalls?: Array<{
        name: string;
        args: Record<string, any>;
        result?: any;
    }>;
    tokens?: { input: number; output: number };
}

const tracedAgent = async (query: string) => {
    const trace: StepLog[] = [];
    let stepNumber = 0;
    let stepStartTime = Date.now();

    const result = await generateText({
        model: openai('gpt-4o'),
        prompt: query,
        tools,
        maxSteps: 10,

        onStepFinish: ({ stepType, text, toolCalls, toolResults, usage }) => {
            const now = Date.now();

            trace.push({
                stepNumber: ++stepNumber,
                type: stepType,
                timestamp: now,
                duration: now - stepStartTime,
                content: text,
                toolCalls: toolCalls?.map((tc, i) => ({
                    name: tc.toolName,
                    args: tc.args,
                    result: toolResults?.[i]?.result,
                })),
                tokens: usage ? {
                    input: usage.promptTokens,
                    output: usage.completionTokens,
                } : undefined,
            });

            stepStartTime = now;
        },
    });

    return {
        answer: result.text,
        trace,
        summary: {
            totalSteps: trace.length,
            totalDuration: trace.reduce((sum, s) => sum + (s.duration || 0), 0),
            totalTokens: result.usage,
            toolsUsed: [...new Set(trace.flatMap(s => s.toolCalls?.map(t => t.name) || []))],
        },
    };
};
```

### Reasoning Visualization

```typescript
const visualizeReasoning = (trace: StepLog[]) => {
    console.log('\n=== Agent Reasoning Trace ===\n');

    for (const step of trace) {
        const indent = '  ';
        console.log(`Step ${step.stepNumber} (${step.type}) - ${step.duration}ms`);

        if (step.content) {
            console.log(`${indent}Thought: ${step.content.substring(0, 100)}...`);
        }

        if (step.toolCalls) {
            for (const tool of step.toolCalls) {
                console.log(`${indent}Tool: ${tool.name}`);
                console.log(`${indent}Args: ${JSON.stringify(tool.args)}`);
                console.log(`${indent}Result: ${JSON.stringify(tool.result).substring(0, 100)}...`);
            }
        }

        console.log('');
    }
};
```

---

## Reflection and Self-Correction

### Self-Critique Pattern

```typescript
const selfCritiqueAgent = async (query: string) => {
    // Generate initial response
    const initial = await generateText({
        model: openai('gpt-4o'),
        prompt: query,
        tools,
        maxSteps: 5,
    });

    // Self-critique
    const critique = await generateText({
        model: openai('gpt-4o'),
        system: `You are a critical reviewer. Analyze this response for:
1. Factual accuracy
2. Logical consistency
3. Completeness
4. Potential improvements`,
        prompt: `Query: ${query}\n\nResponse: ${initial.text}\n\nProvide your critique:`,
    });

    // Improve based on critique
    const improved = await generateText({
        model: openai('gpt-4o'),
        system: 'Improve the response based on the critique.',
        prompt: `Original query: ${query}
Original response: ${initial.text}
Critique: ${critique.text}

Provide an improved response:`,
        tools,
        maxSteps: 5,
    });

    return {
        initial: initial.text,
        critique: critique.text,
        improved: improved.text,
    };
};
```

### Iterative Refinement

```typescript
const iterativeAgent = async (
    query: string,
    maxIterations: number = 3,
    qualityThreshold: number = 0.8
) => {
    let currentResponse = '';
    let qualityScore = 0;
    let iteration = 0;

    while (iteration < maxIterations && qualityScore < qualityThreshold) {
        const result = await generateText({
            model: openai('gpt-4o'),
            system: iteration === 0
                ? 'Answer the question thoroughly.'
                : `Previous answer: ${currentResponse}\nImprove this answer.`,
            prompt: query,
            tools,
            maxSteps: 5,
        });

        currentResponse = result.text;

        // Evaluate quality
        const evaluation = await generateText({
            model: openai('gpt-4o'),
            system: 'Rate the response quality from 0 to 1. Output only the number.',
            prompt: `Query: ${query}\nResponse: ${currentResponse}`,
        });

        qualityScore = parseFloat(evaluation.text);
        iteration++;

        console.log(`Iteration ${iteration}: Quality = ${qualityScore}`);
    }

    return { response: currentResponse, qualityScore, iterations: iteration };
};
```
