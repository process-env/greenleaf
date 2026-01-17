# Memory Systems

## Working Memory

### Conversation Buffer

```typescript
interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    timestamp?: number;
    metadata?: Record<string, any>;
}

class ConversationBuffer {
    private messages: Message[] = [];
    private maxTokens: number;
    private tokenCounter: (text: string) => number;

    constructor(maxTokens: number = 8000) {
        this.maxTokens = maxTokens;
        this.tokenCounter = (text) => Math.ceil(text.length / 4); // Rough estimate
    }

    add(message: Message): void {
        this.messages.push({ ...message, timestamp: Date.now() });
        this.trim();
    }

    private trim(): void {
        // Keep system messages, trim oldest user/assistant messages
        const systemMessages = this.messages.filter(m => m.role === 'system');
        let otherMessages = this.messages.filter(m => m.role !== 'system');

        let totalTokens = this.countTokens(this.messages);

        while (totalTokens > this.maxTokens && otherMessages.length > 2) {
            otherMessages.shift(); // Remove oldest
            totalTokens = this.countTokens([...systemMessages, ...otherMessages]);
        }

        this.messages = [...systemMessages, ...otherMessages];
    }

    private countTokens(messages: Message[]): number {
        return messages.reduce((sum, m) => sum + this.tokenCounter(m.content), 0);
    }

    getMessages(): Message[] {
        return [...this.messages];
    }

    getRecent(n: number): Message[] {
        return this.messages.slice(-n);
    }

    clear(): void {
        this.messages = this.messages.filter(m => m.role === 'system');
    }
}
```

### Sliding Window with Summary

```typescript
class SlidingWindowMemory {
    private buffer: ConversationBuffer;
    private summaries: string[] = [];

    constructor(private windowSize: number = 10) {
        this.buffer = new ConversationBuffer();
    }

    async add(message: Message): Promise<void> {
        this.buffer.add(message);

        // When window exceeds size, summarize older messages
        const messages = this.buffer.getMessages();
        if (messages.length > this.windowSize) {
            const toSummarize = messages.slice(0, messages.length - this.windowSize);
            const summary = await this.summarize(toSummarize);
            this.summaries.push(summary);

            // Keep only recent messages
            this.buffer = new ConversationBuffer();
            messages.slice(-this.windowSize).forEach(m => this.buffer.add(m));
        }
    }

    private async summarize(messages: Message[]): Promise<string> {
        const result = await generateText({
            model: openai('gpt-4o-mini'), // Use smaller model for summaries
            system: 'Summarize this conversation segment concisely, preserving key facts and decisions.',
            prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        });
        return result.text;
    }

    getContext(): { summaries: string[]; recentMessages: Message[] } {
        return {
            summaries: this.summaries,
            recentMessages: this.buffer.getMessages(),
        };
    }

    buildPrompt(): string {
        const context = this.getContext();
        let prompt = '';

        if (context.summaries.length > 0) {
            prompt += 'Previous conversation summary:\n';
            prompt += context.summaries.join('\n---\n');
            prompt += '\n\nRecent messages:\n';
        }

        prompt += context.recentMessages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');

        return prompt;
    }
}
```

---

## Persistent Memory

### Vector Store Integration

```typescript
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

interface MemoryEntry {
    id: string;
    content: string;
    embedding: number[];
    metadata: {
        type: 'conversation' | 'fact' | 'preference' | 'task';
        timestamp: number;
        source?: string;
        importance?: number;
    };
}

class VectorMemory {
    private store: VectorStore; // Pinecone, Qdrant, Chroma, etc.

    async store(content: string, metadata: MemoryEntry['metadata']): Promise<string> {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: content,
        });

        const id = crypto.randomUUID();

        await this.store.upsert({
            id,
            values: embedding,
            metadata: { content, ...metadata },
        });

        return id;
    }

    async recall(
        query: string,
        options: {
            limit?: number;
            filter?: Record<string, any>;
            minScore?: number;
        } = {}
    ): Promise<Array<{ content: string; score: number; metadata: any }>> {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: query,
        });

        const results = await this.store.query({
            vector: embedding,
            topK: options.limit || 5,
            filter: options.filter,
            includeMetadata: true,
        });

        return results.matches
            .filter(m => m.score >= (options.minScore || 0.7))
            .map(m => ({
                content: m.metadata.content,
                score: m.score,
                metadata: m.metadata,
            }));
    }

    async forget(id: string): Promise<void> {
        await this.store.delete({ ids: [id] });
    }

    async update(id: string, content: string): Promise<void> {
        const { embedding } = await embed({
            model: openai.embedding('text-embedding-3-small'),
            value: content,
        });

        await this.store.update({
            id,
            values: embedding,
            metadata: { content },
        });
    }
}
```

### Semantic Memory with Categories

```typescript
class SemanticMemory {
    private vectorMemory: VectorMemory;

    // Store different types of memories
    async rememberFact(fact: string, source?: string): Promise<string> {
        return await this.vectorMemory.store(fact, {
            type: 'fact',
            timestamp: Date.now(),
            source,
            importance: await this.assessImportance(fact),
        });
    }

    async rememberPreference(preference: string): Promise<string> {
        return await this.vectorMemory.store(preference, {
            type: 'preference',
            timestamp: Date.now(),
            importance: 0.8, // Preferences are important
        });
    }

    async rememberConversation(summary: string): Promise<string> {
        return await this.vectorMemory.store(summary, {
            type: 'conversation',
            timestamp: Date.now(),
        });
    }

    // Recall with context-aware filtering
    async recallRelevant(
        query: string,
        context: 'answering' | 'planning' | 'personalizing'
    ): Promise<string[]> {
        const typeWeights: Record<string, Record<string, number>> = {
            answering: { fact: 1.0, conversation: 0.8, preference: 0.5 },
            planning: { fact: 0.8, conversation: 0.6, preference: 0.9 },
            personalizing: { preference: 1.0, conversation: 0.7, fact: 0.5 },
        };

        const results = await this.vectorMemory.recall(query, { limit: 20 });

        // Re-rank based on context
        return results
            .map(r => ({
                ...r,
                adjustedScore: r.score * (typeWeights[context][r.metadata.type] || 0.5),
            }))
            .sort((a, b) => b.adjustedScore - a.adjustedScore)
            .slice(0, 5)
            .map(r => r.content);
    }

    private async assessImportance(content: string): Promise<number> {
        const result = await generateText({
            model: openai('gpt-4o-mini'),
            system: 'Rate the importance of this information from 0 to 1. Output only the number.',
            prompt: content,
        });
        return parseFloat(result.text) || 0.5;
    }
}
```

---

## Episodic Memory

### Episode Storage

```typescript
interface Episode {
    id: string;
    title: string;
    summary: string;
    messages: Message[];
    outcome: 'success' | 'failure' | 'partial' | 'unknown';
    lessons: string[];
    timestamp: number;
    duration: number;
}

class EpisodicMemory {
    private episodes: Episode[] = [];
    private vectorMemory: VectorMemory;

    async saveEpisode(
        title: string,
        messages: Message[],
        outcome: Episode['outcome']
    ): Promise<Episode> {
        // Generate summary and lessons
        const analysis = await generateText({
            model: openai('gpt-4o'),
            system: `Analyze this conversation episode. Output JSON:
{
  "summary": "Brief summary of what happened",
  "lessons": ["Key lesson 1", "Key lesson 2"]
}`,
            prompt: messages.map(m => `${m.role}: ${m.content}`).join('\n'),
        });

        const { summary, lessons } = JSON.parse(analysis.text);

        const episode: Episode = {
            id: crypto.randomUUID(),
            title,
            summary,
            messages,
            outcome,
            lessons,
            timestamp: Date.now(),
            duration: messages[messages.length - 1].timestamp! - messages[0].timestamp!,
        };

        this.episodes.push(episode);

        // Store in vector memory for semantic search
        await this.vectorMemory.store(
            `${title}: ${summary}. Lessons: ${lessons.join('. ')}`,
            { type: 'conversation', timestamp: episode.timestamp }
        );

        return episode;
    }

    async recallSimilarEpisodes(situation: string): Promise<Episode[]> {
        const similar = await this.vectorMemory.recall(situation, { limit: 3 });

        return this.episodes.filter(ep =>
            similar.some(s => s.content.includes(ep.title))
        );
    }

    getRecentEpisodes(n: number): Episode[] {
        return this.episodes.slice(-n);
    }

    getSuccessfulPatterns(): string[] {
        return this.episodes
            .filter(ep => ep.outcome === 'success')
            .flatMap(ep => ep.lessons);
    }
}
```

---

## Context Compression

### Hierarchical Summarization

```typescript
class HierarchicalMemory {
    private levels: Map<number, string[]> = new Map();

    async addToLevel(content: string, level: number): Promise<void> {
        const levelContent = this.levels.get(level) || [];
        levelContent.push(content);
        this.levels.set(level, levelContent);

        // When level has too many items, summarize and promote
        if (levelContent.length >= 5) {
            const summary = await this.summarize(levelContent);
            await this.addToLevel(summary, level + 1);
            this.levels.set(level, []); // Clear this level
        }
    }

    private async summarize(items: string[]): Promise<string> {
        const result = await generateText({
            model: openai('gpt-4o-mini'),
            system: 'Combine these items into a single coherent summary.',
            prompt: items.join('\n---\n'),
        });
        return result.text;
    }

    getContext(maxTokens: number = 2000): string {
        let context = '';
        let tokens = 0;

        // Start from highest level (most summarized)
        const levels = Array.from(this.levels.keys()).sort((a, b) => b - a);

        for (const level of levels) {
            const items = this.levels.get(level) || [];
            for (const item of items) {
                const itemTokens = Math.ceil(item.length / 4);
                if (tokens + itemTokens > maxTokens) return context;
                context += `[L${level}] ${item}\n`;
                tokens += itemTokens;
            }
        }

        return context;
    }
}
```

### Importance-Based Pruning

```typescript
interface ScoredMemory {
    content: string;
    importance: number;
    recency: number;
    accessCount: number;
}

class ImportanceMemory {
    private memories: Map<string, ScoredMemory> = new Map();

    add(id: string, content: string, importance: number): void {
        this.memories.set(id, {
            content,
            importance,
            recency: Date.now(),
            accessCount: 0,
        });
        this.prune();
    }

    access(id: string): ScoredMemory | undefined {
        const memory = this.memories.get(id);
        if (memory) {
            memory.accessCount++;
            memory.recency = Date.now();
        }
        return memory;
    }

    private calculateScore(memory: ScoredMemory): number {
        const recencyScore = 1 / (1 + (Date.now() - memory.recency) / (1000 * 60 * 60 * 24)); // Decay over days
        const accessScore = Math.log(memory.accessCount + 1) / 10;
        return memory.importance * 0.5 + recencyScore * 0.3 + accessScore * 0.2;
    }

    private prune(maxSize: number = 100): void {
        if (this.memories.size <= maxSize) return;

        const sorted = Array.from(this.memories.entries())
            .map(([id, memory]) => ({ id, score: this.calculateScore(memory) }))
            .sort((a, b) => a.score - b.score);

        // Remove lowest scoring
        const toRemove = sorted.slice(0, this.memories.size - maxSize);
        toRemove.forEach(({ id }) => this.memories.delete(id));
    }

    getTopMemories(n: number): string[] {
        return Array.from(this.memories.values())
            .sort((a, b) => this.calculateScore(b) - this.calculateScore(a))
            .slice(0, n)
            .map(m => m.content);
    }
}
```

---

## Agent Memory Integration

### Complete Memory-Enhanced Agent

```typescript
class MemoryAgent {
    private workingMemory: SlidingWindowMemory;
    private semanticMemory: SemanticMemory;
    private episodicMemory: EpisodicMemory;
    private currentEpisode: Message[] = [];

    constructor() {
        this.workingMemory = new SlidingWindowMemory(10);
        this.semanticMemory = new SemanticMemory();
        this.episodicMemory = new EpisodicMemory();
    }

    async chat(userMessage: string): Promise<string> {
        // Add to working memory
        const userMsg: Message = { role: 'user', content: userMessage, timestamp: Date.now() };
        await this.workingMemory.add(userMsg);
        this.currentEpisode.push(userMsg);

        // Recall relevant long-term memories
        const relevantFacts = await this.semanticMemory.recallRelevant(userMessage, 'answering');
        const similarEpisodes = await this.episodicMemory.recallSimilarEpisodes(userMessage);

        // Build context
        const context = this.workingMemory.buildPrompt();
        const longTermContext = relevantFacts.length > 0
            ? `\n\nRelevant knowledge:\n${relevantFacts.join('\n')}`
            : '';
        const episodeContext = similarEpisodes.length > 0
            ? `\n\nSimilar past situations:\n${similarEpisodes.map(e => `- ${e.summary}`).join('\n')}`
            : '';

        // Generate response
        const result = await generateText({
            model: openai('gpt-4o'),
            system: `You are a helpful assistant with memory of past conversations.
${longTermContext}${episodeContext}`,
            prompt: context + '\n\nassistant:',
            tools: this.tools,
            maxSteps: 10,
        });

        // Store response
        const assistantMsg: Message = { role: 'assistant', content: result.text, timestamp: Date.now() };
        await this.workingMemory.add(assistantMsg);
        this.currentEpisode.push(assistantMsg);

        // Extract and store any new facts
        await this.extractAndStoreFacts(result.text);

        return result.text;
    }

    private async extractAndStoreFacts(response: string): Promise<void> {
        const extraction = await generateText({
            model: openai('gpt-4o-mini'),
            system: 'Extract any factual statements worth remembering. Output JSON array of strings, or empty array.',
            prompt: response,
        });

        const facts = JSON.parse(extraction.text) as string[];
        for (const fact of facts) {
            await this.semanticMemory.rememberFact(fact);
        }
    }

    async endSession(outcome: Episode['outcome']): Promise<void> {
        if (this.currentEpisode.length > 0) {
            await this.episodicMemory.saveEpisode(
                `Session ${new Date().toISOString()}`,
                this.currentEpisode,
                outcome
            );
            this.currentEpisode = [];
        }
    }
}
```
