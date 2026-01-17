import { prisma } from "@greenleaf/db";
import { generateEmbedding } from "./embeddings.js";

export interface StrainResult {
  id: string;
  name: string;
  slug: string;
  type: string;
  thcPercent: number | null;
  cbdPercent: number | null;
  effects: string[];
  flavors: string[];
  description: string | null;
  similarity: number;
}

export async function retrieveSimilarStrains(
  query: string,
  limit: number = 5
): Promise<StrainResult[]> {
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector similarity search using pgvector
  const results = await prisma.$queryRaw<StrainResult[]>`
    SELECT
      id,
      name,
      slug,
      type,
      "thcPercent",
      "cbdPercent",
      effects,
      flavors,
      description,
      1 - (embedding <=> ${queryEmbedding}::vector) as similarity
    FROM "Strain"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}

export async function retrieveStrainsByEffects(
  effects: string[],
  limit: number = 5
): Promise<StrainResult[]> {
  const strains = await prisma.strain.findMany({
    where: {
      effects: {
        hasSome: effects,
      },
      inventory: {
        some: {
          quantity: { gt: 0 },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      thcPercent: true,
      cbdPercent: true,
      effects: true,
      flavors: true,
      description: true,
    },
    take: limit,
    orderBy: {
      thcPercent: "desc",
    },
  });

  return strains.map((s) => ({
    ...s,
    similarity: 1,
  }));
}

export async function retrieveStrainsByType(
  type: "INDICA" | "SATIVA" | "HYBRID",
  limit: number = 5
): Promise<StrainResult[]> {
  const strains = await prisma.strain.findMany({
    where: {
      type,
      inventory: {
        some: {
          quantity: { gt: 0 },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      thcPercent: true,
      cbdPercent: true,
      effects: true,
      flavors: true,
      description: true,
    },
    take: limit,
    orderBy: {
      thcPercent: "desc",
    },
  });

  return strains.map((s) => ({
    ...s,
    similarity: 1,
  }));
}

export function formatStrainsForContext(strains: StrainResult[]): string {
  return strains
    .map(
      (strain, index) =>
        `${index + 1}. **${strain.name}** (${strain.type})
   - THC: ${strain.thcPercent ?? "N/A"}%
   - Effects: ${strain.effects.join(", ")}
   - Flavors: ${strain.flavors.join(", ")}
   - ${strain.description ?? "No description available"}`
    )
    .join("\n\n");
}
