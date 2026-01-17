import { OpenAIEmbeddings } from "@langchain/openai";

export const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  dimensions: 1536,
});

export async function generateEmbedding(text: string): Promise<number[]> {
  return embeddings.embedQuery(text);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  return embeddings.embedDocuments(texts);
}
