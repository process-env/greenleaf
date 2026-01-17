import { prisma } from "@greenleaf/db";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function createStrainText(strain: {
  name: string;
  type: string;
  effects: string[];
  flavors: string[];
  description: string | null;
  thcPercent: number | null;
  cbdPercent: number | null;
}): string {
  const parts = [
    `${strain.name} is a ${strain.type.toLowerCase()} cannabis strain.`,
  ];

  if (strain.thcPercent) {
    parts.push(`It has approximately ${strain.thcPercent}% THC.`);
  }

  if (strain.cbdPercent && strain.cbdPercent > 0.5) {
    parts.push(`It contains ${strain.cbdPercent}% CBD.`);
  }

  if (strain.effects.length > 0) {
    parts.push(`Effects include: ${strain.effects.join(", ")}.`);
  }

  if (strain.flavors.length > 0) {
    parts.push(`Flavors: ${strain.flavors.join(", ")}.`);
  }

  if (strain.description) {
    parts.push(strain.description);
  }

  return parts.join(" ");
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

async function generateAllEmbeddings() {
  console.log("Generating embeddings for all strains...");

  const strains = await prisma.strain.findMany();
  console.log(`Found ${strains.length} strains`);

  let processed = 0;
  let failed = 0;

  for (const strain of strains) {
    try {
      const text = createStrainText(strain);
      const embedding = await generateEmbedding(text);

      // Update strain with embedding using raw SQL (pgvector)
      await prisma.$executeRaw`
        UPDATE "Strain"
        SET embedding = ${embedding}::vector
        WHERE id = ${strain.id}
      `;

      processed++;
      console.log(`  [${processed}/${strains.length}] Generated embedding for: ${strain.name}`);

      // Rate limiting - OpenAI allows 3000 RPM for text-embedding-3-small
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failed++;
      console.error(`  Error generating embedding for ${strain.name}:`, error);
    }
  }

  console.log(`\nEmbedding generation complete!`);
  console.log(`  Processed: ${processed}`);
  console.log(`  Failed: ${failed}`);
}

// Create vector similarity search index
async function createVectorIndex() {
  console.log("Creating vector similarity search index...");

  try {
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS strain_embedding_idx
      ON "Strain"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `;
    console.log("Vector index created successfully");
  } catch (error) {
    console.error("Error creating vector index:", error);
  }
}

async function main() {
  await generateAllEmbeddings();
  await createVectorIndex();
}

main()
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { generateEmbedding, createStrainText };
