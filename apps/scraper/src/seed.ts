import { prisma } from "@greenleaf/db";
import { getFallbackStrains, type ScrapedStrain } from "./leafly.js";
import fs from "fs/promises";
import path from "path";

async function loadStrains(): Promise<ScrapedStrain[]> {
  const dataPath = path.join(process.cwd(), "data", "strains.json");

  try {
    const data = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(data) as ScrapedStrain[];
  } catch {
    console.log("No scraped data found, using fallback strains...");
    return getFallbackStrains();
  }
}

function generateRandomPrice(): number {
  // Price per gram between $8 and $18
  return Math.round((Math.random() * 10 + 8) * 100) / 100;
}

function generateRandomQuantity(): number {
  // Quantity between 10 and 100 grams
  return Math.floor(Math.random() * 90) + 10;
}

async function seed() {
  console.log("Starting database seed...");

  const strains = await loadStrains();
  console.log(`Loaded ${strains.length} strains for seeding`);

  // Clear existing data
  console.log("Clearing existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.strain.deleteMany();

  // Insert strains with inventory
  console.log("Inserting strains and inventory...");

  for (const strain of strains) {
    try {
      const createdStrain = await prisma.strain.create({
        data: {
          slug: strain.slug,
          name: strain.name,
          type: strain.type,
          thcPercent: strain.thcPercent,
          cbdPercent: strain.cbdPercent,
          effects: strain.effects,
          flavors: strain.flavors,
          description: strain.description,
          leaflyUrl: strain.leaflyUrl,
          imageUrl: `https://images.leafly.com/flower250/${strain.slug}.png`,
        },
      });

      // Create inventory for the strain
      await prisma.inventory.create({
        data: {
          strainId: createdStrain.id,
          quantity: generateRandomQuantity(),
          pricePerGram: generateRandomPrice(),
        },
      });

      console.log(`  Created strain: ${strain.name}`);
    } catch (error) {
      console.error(`  Error creating strain ${strain.name}:`, error);
    }
  }

  const totalStrains = await prisma.strain.count();
  console.log(`\nSeed complete! Created ${totalStrains} strains with inventory.`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
