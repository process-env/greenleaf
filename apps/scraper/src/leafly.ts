import FirecrawlApp from "@mendable/firecrawl-js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_API_KEY!,
});

// Schema for extracting strain data from Leafly
const strainSchema = z.object({
  strains: z.array(
    z.object({
      name: z.string().describe("The name of the cannabis strain"),
      type: z
        .enum(["indica", "sativa", "hybrid"])
        .describe("The strain type: indica, sativa, or hybrid"),
      thcPercent: z
        .number()
        .nullable()
        .describe("The THC percentage if available"),
      cbdPercent: z
        .number()
        .nullable()
        .describe("The CBD percentage if available"),
      effects: z
        .array(z.string())
        .describe("Array of effects like relaxed, happy, euphoric"),
      flavors: z
        .array(z.string())
        .describe("Array of flavors like earthy, citrus, pine"),
      description: z
        .string()
        .nullable()
        .describe("Description of the strain"),
    })
  ),
});

type ExtractedStrain = z.infer<typeof strainSchema>["strains"][number];

export interface ScrapedStrain {
  name: string;
  slug: string;
  type: "INDICA" | "SATIVA" | "HYBRID";
  thcPercent: number | null;
  cbdPercent: number | null;
  effects: string[];
  flavors: string[];
  description: string | null;
  leaflyUrl: string | null;
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeType(type: string): "INDICA" | "SATIVA" | "HYBRID" {
  const normalized = type.toUpperCase();
  if (normalized === "INDICA" || normalized === "SATIVA" || normalized === "HYBRID") {
    return normalized;
  }
  return "HYBRID";
}

function transformStrain(strain: ExtractedStrain): ScrapedStrain {
  return {
    name: strain.name,
    slug: createSlug(strain.name),
    type: normalizeType(strain.type),
    thcPercent: strain.thcPercent,
    cbdPercent: strain.cbdPercent,
    effects: strain.effects.map((e) => e.toLowerCase()),
    flavors: strain.flavors.map((f) => f.toLowerCase()),
    description: strain.description,
    leaflyUrl: `https://www.leafly.com/strains/${createSlug(strain.name)}`,
  };
}

async function scrapeLeaflyStrains(): Promise<ScrapedStrain[]> {
  console.log("Starting Leafly strain scraping with Firecrawl...");

  // Scrape the main strains listing pages
  const strainUrls = [
    "https://www.leafly.com/strains",
    "https://www.leafly.com/strains?sort=popular",
  ];

  const allStrains: ScrapedStrain[] = [];
  const seenSlugs = new Set<string>();

  for (const url of strainUrls) {
    try {
      console.log(`Scraping ${url}...`);

      const result = await firecrawl.scrapeUrl(url, {
        formats: ["extract"],
        extract: {
          schema: strainSchema,
          prompt:
            "Extract all cannabis strain information from this page. For each strain, get the name, type (indica/sativa/hybrid), THC percentage, CBD percentage, effects (like relaxed, happy, euphoric), flavors (like earthy, citrus), and description.",
        },
      });

      if (result.success && result.extract) {
        const extracted = strainSchema.parse(result.extract);

        for (const strain of extracted.strains) {
          const transformed = transformStrain(strain);
          if (!seenSlugs.has(transformed.slug)) {
            seenSlugs.add(transformed.slug);
            allStrains.push(transformed);
          }
        }

        console.log(`Extracted ${extracted.strains.length} strains from ${url}`);
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }

  // If Firecrawl extraction didn't get enough strains, use fallback data
  if (allStrains.length < 20) {
    console.log("Using fallback strain data to supplement...");
    const fallbackStrains = getFallbackStrains();
    for (const strain of fallbackStrains) {
      if (!seenSlugs.has(strain.slug)) {
        seenSlugs.add(strain.slug);
        allStrains.push(strain);
      }
    }
  }

  console.log(`Total unique strains collected: ${allStrains.length}`);
  return allStrains;
}

// Fallback strain data in case Firecrawl rate limits or fails
function getFallbackStrains(): ScrapedStrain[] {
  return [
    {
      name: "Blue Dream",
      slug: "blue-dream",
      type: "HYBRID",
      thcPercent: 21,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "creative"],
      flavors: ["blueberry", "sweet", "berry"],
      description:
        "Blue Dream is a sativa-dominant hybrid that balances full-body relaxation with gentle cerebral invigoration.",
      leaflyUrl: "https://www.leafly.com/strains/blue-dream",
    },
    {
      name: "OG Kush",
      slug: "og-kush",
      type: "HYBRID",
      thcPercent: 23,
      cbdPercent: 0.3,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "hungry"],
      flavors: ["earthy", "pine", "woody"],
      description:
        "OG Kush is a legendary strain with a unique terpene profile featuring a complex aroma with notes of fuel, skunk, and spice.",
      leaflyUrl: "https://www.leafly.com/strains/og-kush",
    },
    {
      name: "Sour Diesel",
      slug: "sour-diesel",
      type: "SATIVA",
      thcPercent: 22,
      cbdPercent: 0.2,
      effects: ["energetic", "happy", "uplifted", "euphoric", "creative"],
      flavors: ["diesel", "pungent", "earthy"],
      description:
        "Sour Diesel is an invigorating sativa-dominant strain named after its pungent, diesel-like aroma.",
      leaflyUrl: "https://www.leafly.com/strains/sour-diesel",
    },
    {
      name: "Girl Scout Cookies",
      slug: "girl-scout-cookies",
      type: "HYBRID",
      thcPercent: 25,
      cbdPercent: 0.2,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "creative"],
      flavors: ["sweet", "earthy", "pungent"],
      description:
        "Girl Scout Cookies is a potent hybrid that delivers full-body relaxation and cerebral euphoria.",
      leaflyUrl: "https://www.leafly.com/strains/girl-scout-cookies",
    },
    {
      name: "Granddaddy Purple",
      slug: "granddaddy-purple",
      type: "INDICA",
      thcPercent: 20,
      cbdPercent: 0.1,
      effects: ["relaxed", "sleepy", "happy", "euphoric", "hungry"],
      flavors: ["grape", "berry", "sweet"],
      description:
        "Granddaddy Purple is a famous indica cross with complex grape and berry aromas.",
      leaflyUrl: "https://www.leafly.com/strains/granddaddy-purple",
    },
    {
      name: "Jack Herer",
      slug: "jack-herer",
      type: "SATIVA",
      thcPercent: 21,
      cbdPercent: 0.1,
      effects: ["happy", "uplifted", "energetic", "creative", "focused"],
      flavors: ["earthy", "pine", "woody"],
      description:
        "Jack Herer is a sativa-dominant strain named after the legendary cannabis activist and author.",
      leaflyUrl: "https://www.leafly.com/strains/jack-herer",
    },
    {
      name: "Northern Lights",
      slug: "northern-lights",
      type: "INDICA",
      thcPercent: 18,
      cbdPercent: 0.1,
      effects: ["relaxed", "sleepy", "happy", "euphoric", "hungry"],
      flavors: ["earthy", "pine", "sweet"],
      description:
        "Northern Lights is one of the most famous indica strains, known for its resinous buds and fast flowering.",
      leaflyUrl: "https://www.leafly.com/strains/northern-lights",
    },
    {
      name: "White Widow",
      slug: "white-widow",
      type: "HYBRID",
      thcPercent: 20,
      cbdPercent: 0.2,
      effects: ["happy", "relaxed", "euphoric", "uplifted", "energetic"],
      flavors: ["earthy", "woody", "pungent"],
      description:
        "White Widow is a balanced hybrid first bred in the Netherlands, famous for its white crystal resin.",
      leaflyUrl: "https://www.leafly.com/strains/white-widow",
    },
    {
      name: "Gorilla Glue",
      slug: "gorilla-glue",
      type: "HYBRID",
      thcPercent: 26,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "sleepy"],
      flavors: ["earthy", "pungent", "pine"],
      description:
        "Gorilla Glue is a potent hybrid that delivers heavy-handed euphoria and relaxation.",
      leaflyUrl: "https://www.leafly.com/strains/gorilla-glue",
    },
    {
      name: "Green Crack",
      slug: "green-crack",
      type: "SATIVA",
      thcPercent: 22,
      cbdPercent: 0.1,
      effects: ["energetic", "focused", "happy", "uplifted", "creative"],
      flavors: ["citrus", "earthy", "sweet"],
      description:
        "Green Crack is a sharp sativa that provides an invigorating mental buzz to keep you going throughout the day.",
      leaflyUrl: "https://www.leafly.com/strains/green-crack",
    },
    {
      name: "Pineapple Express",
      slug: "pineapple-express",
      type: "HYBRID",
      thcPercent: 19,
      cbdPercent: 0.1,
      effects: ["happy", "uplifted", "euphoric", "relaxed", "creative"],
      flavors: ["pineapple", "tropical", "sweet"],
      description:
        "Pineapple Express combines the potent and flavorful forces of parent strains Trainwreck and Hawaiian.",
      leaflyUrl: "https://www.leafly.com/strains/pineapple-express",
    },
    {
      name: "AK-47",
      slug: "ak-47",
      type: "HYBRID",
      thcPercent: 20,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "uplifted", "euphoric", "creative"],
      flavors: ["earthy", "pungent", "woody"],
      description:
        "AK-47 is a sativa-dominant hybrid with bright, sour notes and a long-lasting cerebral buzz.",
      leaflyUrl: "https://www.leafly.com/strains/ak-47",
    },
    {
      name: "Purple Haze",
      slug: "purple-haze",
      type: "SATIVA",
      thcPercent: 17,
      cbdPercent: 0.1,
      effects: ["happy", "uplifted", "euphoric", "creative", "energetic"],
      flavors: ["earthy", "berry", "sweet"],
      description:
        "Purple Haze is a sativa strain named for its purple-tinged buds and Jimi Hendrix association.",
      leaflyUrl: "https://www.leafly.com/strains/purple-haze",
    },
    {
      name: "Wedding Cake",
      slug: "wedding-cake",
      type: "HYBRID",
      thcPercent: 24,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "hungry"],
      flavors: ["sweet", "vanilla", "earthy"],
      description:
        "Wedding Cake is a potent indica-hybrid known for its rich, tangy flavor with earthy pepper undertones.",
      leaflyUrl: "https://www.leafly.com/strains/wedding-cake",
    },
    {
      name: "Gelato",
      slug: "gelato",
      type: "HYBRID",
      thcPercent: 23,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "creative"],
      flavors: ["sweet", "citrus", "earthy"],
      description:
        "Gelato is a hybrid with a dessert-like aroma, offering a balanced high and fruity flavor.",
      leaflyUrl: "https://www.leafly.com/strains/gelato",
    },
    {
      name: "Bubba Kush",
      slug: "bubba-kush",
      type: "INDICA",
      thcPercent: 17,
      cbdPercent: 0.1,
      effects: ["relaxed", "sleepy", "happy", "hungry", "euphoric"],
      flavors: ["earthy", "sweet", "coffee"],
      description:
        "Bubba Kush is a heavy indica with tranquilizing effects that have made it a favorite for relaxation.",
      leaflyUrl: "https://www.leafly.com/strains/bubba-kush",
    },
    {
      name: "Durban Poison",
      slug: "durban-poison",
      type: "SATIVA",
      thcPercent: 20,
      cbdPercent: 0.1,
      effects: ["energetic", "uplifted", "happy", "focused", "creative"],
      flavors: ["earthy", "sweet", "pine"],
      description:
        "Durban Poison is a pure sativa landrace from South Africa, known for its sweet smell and energetic effects.",
      leaflyUrl: "https://www.leafly.com/strains/durban-poison",
    },
    {
      name: "Skywalker OG",
      slug: "skywalker-og",
      type: "INDICA",
      thcPercent: 22,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "sleepy", "euphoric", "hungry"],
      flavors: ["earthy", "pungent", "spicy"],
      description:
        "Skywalker OG is an indica-dominant hybrid with strong relaxation effects and a spicy herbal taste.",
      leaflyUrl: "https://www.leafly.com/strains/skywalker-og",
    },
    {
      name: "Strawberry Cough",
      slug: "strawberry-cough",
      type: "SATIVA",
      thcPercent: 18,
      cbdPercent: 0.1,
      effects: ["happy", "uplifted", "euphoric", "energetic", "creative"],
      flavors: ["strawberry", "sweet", "berry"],
      description:
        "Strawberry Cough is a sativa known for its sweet strawberry smell and uplifting, euphoric effects.",
      leaflyUrl: "https://www.leafly.com/strains/strawberry-cough",
    },
    {
      name: "Amnesia Haze",
      slug: "amnesia-haze",
      type: "SATIVA",
      thcPercent: 21,
      cbdPercent: 0.1,
      effects: ["happy", "uplifted", "euphoric", "energetic", "creative"],
      flavors: ["citrus", "lemon", "earthy"],
      description:
        "Amnesia Haze is an award-winning sativa with earthy, citrus flavors and a long-lasting cerebral high.",
      leaflyUrl: "https://www.leafly.com/strains/amnesia-haze",
    },
    {
      name: "Chemdawg",
      slug: "chemdawg",
      type: "HYBRID",
      thcPercent: 21,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "creative"],
      flavors: ["diesel", "pungent", "earthy"],
      description:
        "Chemdawg is a legendary hybrid with uncertain origins but undeniable potency and diesel-like aroma.",
      leaflyUrl: "https://www.leafly.com/strains/chemdawg",
    },
    {
      name: "Trainwreck",
      slug: "trainwreck",
      type: "HYBRID",
      thcPercent: 21,
      cbdPercent: 0.1,
      effects: ["happy", "euphoric", "uplifted", "creative", "energetic"],
      flavors: ["pine", "earthy", "lemon"],
      description:
        "Trainwreck is a potent sativa-dominant hybrid with a sweet lemon and spicy pine aroma.",
      leaflyUrl: "https://www.leafly.com/strains/trainwreck",
    },
    {
      name: "Super Lemon Haze",
      slug: "super-lemon-haze",
      type: "SATIVA",
      thcPercent: 22,
      cbdPercent: 0.1,
      effects: ["happy", "energetic", "uplifted", "creative", "focused"],
      flavors: ["lemon", "citrus", "sweet"],
      description:
        "Super Lemon Haze is a kief-caked sativa with zesty lemon flavor and energizing effects.",
      leaflyUrl: "https://www.leafly.com/strains/super-lemon-haze",
    },
    {
      name: "Runtz",
      slug: "runtz",
      type: "HYBRID",
      thcPercent: 24,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "uplifted", "giggly"],
      flavors: ["sweet", "tropical", "fruity"],
      description:
        "Runtz is a rare hybrid with fruity flavor and relaxing yet euphoric effects.",
      leaflyUrl: "https://www.leafly.com/strains/runtz",
    },
    {
      name: "Zkittlez",
      slug: "zkittlez",
      type: "INDICA",
      thcPercent: 19,
      cbdPercent: 0.1,
      effects: ["relaxed", "happy", "euphoric", "sleepy", "uplifted"],
      flavors: ["sweet", "tropical", "berry"],
      description:
        "Zkittlez is an indica-dominant strain with a sweet tropical blend of fruit flavors.",
      leaflyUrl: "https://www.leafly.com/strains/zkittlez",
    },
  ];
}

// Main execution
async function main() {
  const strains = await scrapeLeaflyStrains();

  // Save to JSON file for seeding
  const outputPath = path.join(process.cwd(), "data", "strains.json");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(strains, null, 2));

  console.log(`Saved ${strains.length} strains to ${outputPath}`);
}

main().catch(console.error);

export { scrapeLeaflyStrains, getFallbackStrains, type ScrapedStrain };
