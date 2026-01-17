import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  retrieveSimilarStrains,
  formatStrainsForContext,
} from "./retriever.js";

const SYSTEM_PROMPT = `You are an expert AI budtender at GreenLeaf Dispensary, a premium cannabis store. You are knowledgeable, friendly, and helpful.

Your role is to:
1. Help customers find the perfect cannabis strain based on their needs
2. Explain the differences between indica, sativa, and hybrid strains
3. Describe effects, flavors, and potency levels
4. Make personalized recommendations based on desired effects (relaxation, energy, creativity, pain relief, etc.)
5. Answer questions about cannabis products responsibly

Guidelines:
- Always be professional and educational
- Remind customers to consume responsibly
- Never make medical claims - suggest they consult a healthcare provider for medical advice
- If asked about illegal activities, politely decline and redirect the conversation
- Keep responses concise but informative
- When recommending strains, explain WHY each strain might be suitable

When you have strain information available, use it to make specific recommendations. Format strain names as links like this: [Strain Name](/strains/strain-slug)

Remember: You're here to help customers have a safe, enjoyable experience. Be the knowledgeable friend they need!`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function createBudtenderChain() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0.7,
    streaming: true,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage(SYSTEM_PROMPT),
    new MessagesPlaceholder("history"),
    new MessagesPlaceholder("context"),
    ["human", "{input}"],
  ]);

  return { model, prompt };
}

export async function generateResponse(
  userMessage: string,
  history: ChatMessage[] = []
) {
  const { model, prompt } = await createBudtenderChain();

  // Retrieve relevant strains based on the user's message
  const relevantStrains = await retrieveSimilarStrains(userMessage, 5);
  const strainContext = formatStrainsForContext(relevantStrains);

  // Convert chat history to LangChain message format
  const historyMessages = history.map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );

  // Create context message with relevant strains
  const contextMessage =
    relevantStrains.length > 0
      ? new SystemMessage(
          `Here are some relevant strains from our inventory that might match what the customer is looking for:\n\n${strainContext}\n\nUse this information to make personalized recommendations.`
        )
      : new SystemMessage(
          "No specific strain context available. Provide general cannabis education and guidance."
        );

  const chain = prompt.pipe(model);

  const response = await chain.invoke({
    history: historyMessages,
    context: [contextMessage],
    input: userMessage,
  });

  return response.content as string;
}

export async function* streamResponse(
  userMessage: string,
  history: ChatMessage[] = []
) {
  const { model, prompt } = await createBudtenderChain();

  // Retrieve relevant strains based on the user's message
  const relevantStrains = await retrieveSimilarStrains(userMessage, 5);
  const strainContext = formatStrainsForContext(relevantStrains);

  // Convert chat history to LangChain message format
  const historyMessages = history.map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );

  // Create context message with relevant strains
  const contextMessage =
    relevantStrains.length > 0
      ? new SystemMessage(
          `Here are some relevant strains from our inventory that might match what the customer is looking for:\n\n${strainContext}\n\nUse this information to make personalized recommendations.`
        )
      : new SystemMessage(
          "No specific strain context available. Provide general cannabis education and guidance."
        );

  const chain = prompt.pipe(model);

  const stream = await chain.stream({
    history: historyMessages,
    context: [contextMessage],
    input: userMessage,
  });

  for await (const chunk of stream) {
    if (chunk.content) {
      yield chunk.content as string;
    }
  }
}
