# Extraction Examples

Real-world schemas and patterns for extracting structured data.

## E-Commerce Product

```typescript
import { z } from 'zod';

const ProductSchema = z.object({
    name: z.string().describe('Product name/title'),
    price: z.number().describe('Current price in USD'),
    originalPrice: z.number().optional().describe('Original price if on sale'),
    currency: z.string().default('USD'),
    description: z.string().describe('Product description'),
    features: z.array(z.string()).describe('List of product features'),
    specifications: z.record(z.string()).describe('Technical specifications'),
    images: z.array(z.string()).describe('Image URLs'),
    rating: z.number().optional().describe('Average rating (0-5)'),
    reviewCount: z.number().optional().describe('Number of reviews'),
    inStock: z.boolean().describe('Whether product is in stock'),
    sku: z.string().optional().describe('Product SKU/ID'),
    brand: z.string().optional(),
    category: z.array(z.string()).describe('Product categories/breadcrumbs'),
});

const result = await firecrawl.scrapeUrl('https://amazon.com/product/xyz', {
    formats: ['extract'],
    extract: {
        schema: ProductSchema,
        prompt: 'Extract all product information from this product page',
    },
});

console.log(result.extract);
// {
//   name: "Wireless Headphones",
//   price: 79.99,
//   originalPrice: 129.99,
//   ...
// }
```

---

## News Article

```typescript
const ArticleSchema = z.object({
    headline: z.string(),
    subheadline: z.string().optional(),
    author: z.object({
        name: z.string(),
        bio: z.string().optional(),
        imageUrl: z.string().optional(),
    }).optional(),
    publishedDate: z.string().describe('ISO date string'),
    modifiedDate: z.string().optional(),
    content: z.string().describe('Full article text'),
    summary: z.string().describe('Article summary in 2-3 sentences'),
    category: z.string(),
    tags: z.array(z.string()),
    images: z.array(z.object({
        url: z.string(),
        caption: z.string().optional(),
        credit: z.string().optional(),
    })),
    relatedArticles: z.array(z.object({
        title: z.string(),
        url: z.string(),
    })).optional(),
});

const result = await firecrawl.scrapeUrl('https://news-site.com/article', {
    formats: ['extract'],
    extract: {
        schema: ArticleSchema,
        prompt: 'Extract the news article content and metadata',
    },
});
```

---

## Job Posting

```typescript
const JobSchema = z.object({
    title: z.string(),
    company: z.object({
        name: z.string(),
        logo: z.string().optional(),
        website: z.string().optional(),
        description: z.string().optional(),
    }),
    location: z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string(),
        remote: z.boolean(),
        hybrid: z.boolean().optional(),
    }),
    salary: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        currency: z.string().default('USD'),
        period: z.enum(['hourly', 'monthly', 'yearly']),
    }).optional(),
    employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
    experienceLevel: z.enum(['entry', 'mid', 'senior', 'lead', 'executive']).optional(),
    description: z.string(),
    responsibilities: z.array(z.string()),
    requirements: z.array(z.string()),
    niceToHave: z.array(z.string()).optional(),
    benefits: z.array(z.string()).optional(),
    applicationUrl: z.string().optional(),
    postedDate: z.string().optional(),
    deadline: z.string().optional(),
});

const result = await firecrawl.scrapeUrl('https://linkedin.com/jobs/view/123', {
    formats: ['extract'],
    extract: {
        schema: JobSchema,
        prompt: 'Extract all job posting details',
    },
});
```

---

## Company Profile

```typescript
const CompanySchema = z.object({
    name: z.string(),
    legalName: z.string().optional(),
    description: z.string(),
    tagline: z.string().optional(),
    founded: z.string().optional(),
    headquarters: z.object({
        address: z.string().optional(),
        city: z.string(),
        state: z.string().optional(),
        country: z.string(),
    }),
    employees: z.object({
        count: z.number().optional(),
        range: z.string().optional(),  // e.g., "500-1000"
    }).optional(),
    industry: z.array(z.string()),
    website: z.string(),
    socialLinks: z.object({
        linkedin: z.string().optional(),
        twitter: z.string().optional(),
        facebook: z.string().optional(),
        instagram: z.string().optional(),
    }).optional(),
    funding: z.object({
        totalRaised: z.string().optional(),
        lastRound: z.string().optional(),
        investors: z.array(z.string()).optional(),
    }).optional(),
    leadership: z.array(z.object({
        name: z.string(),
        title: z.string(),
        imageUrl: z.string().optional(),
    })).optional(),
    products: z.array(z.string()).optional(),
    competitors: z.array(z.string()).optional(),
});

const result = await firecrawl.extract(
    ['https://company.com/about', 'https://crunchbase.com/company/xyz'],
    {
        schema: CompanySchema,
        prompt: 'Extract comprehensive company information',
        allowExternalLinks: true,
    }
);
```

---

## Real Estate Listing

```typescript
const PropertySchema = z.object({
    address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        zipCode: z.string(),
        country: z.string().default('USA'),
    }),
    price: z.number(),
    pricePerSqFt: z.number().optional(),
    propertyType: z.enum(['house', 'condo', 'apartment', 'townhouse', 'land', 'commercial']),
    status: z.enum(['for-sale', 'for-rent', 'sold', 'pending']),
    bedrooms: z.number(),
    bathrooms: z.number(),
    squareFeet: z.number(),
    lotSize: z.string().optional(),
    yearBuilt: z.number().optional(),
    description: z.string(),
    features: z.array(z.string()),
    amenities: z.array(z.string()).optional(),
    images: z.array(z.string()),
    virtualTourUrl: z.string().optional(),
    agent: z.object({
        name: z.string(),
        phone: z.string().optional(),
        email: z.string().optional(),
        company: z.string().optional(),
    }).optional(),
    mls: z.string().optional(),
    listedDate: z.string().optional(),
});

const result = await firecrawl.scrapeUrl('https://zillow.com/property/123', {
    formats: ['extract'],
    extract: {
        schema: PropertySchema,
        prompt: 'Extract all property listing details',
    },
});
```

---

## Recipe

```typescript
const RecipeSchema = z.object({
    name: z.string(),
    description: z.string(),
    author: z.string().optional(),
    prepTime: z.string().describe('Prep time in minutes'),
    cookTime: z.string().describe('Cook time in minutes'),
    totalTime: z.string().describe('Total time in minutes'),
    servings: z.number(),
    difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
    cuisine: z.string().optional(),
    category: z.string().optional(),
    ingredients: z.array(z.object({
        item: z.string(),
        amount: z.string(),
        unit: z.string().optional(),
        notes: z.string().optional(),
    })),
    instructions: z.array(z.object({
        step: z.number(),
        text: z.string(),
        tip: z.string().optional(),
    })),
    nutritionInfo: z.object({
        calories: z.number().optional(),
        protein: z.string().optional(),
        carbs: z.string().optional(),
        fat: z.string().optional(),
        fiber: z.string().optional(),
    }).optional(),
    rating: z.number().optional(),
    reviewCount: z.number().optional(),
    imageUrl: z.string().optional(),
    tags: z.array(z.string()).optional(),
});
```

---

## Documentation Page

```typescript
const DocSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    content: z.string().describe('Main documentation content in markdown'),
    codeExamples: z.array(z.object({
        language: z.string(),
        code: z.string(),
        description: z.string().optional(),
    })),
    apiReference: z.array(z.object({
        name: z.string(),
        type: z.string(),
        description: z.string(),
        parameters: z.array(z.object({
            name: z.string(),
            type: z.string(),
            required: z.boolean(),
            description: z.string(),
        })).optional(),
        returns: z.string().optional(),
        example: z.string().optional(),
    })).optional(),
    relatedPages: z.array(z.object({
        title: z.string(),
        url: z.string(),
    })).optional(),
    lastUpdated: z.string().optional(),
    version: z.string().optional(),
});
```

---

## Batch Extraction Pattern

```typescript
async function extractFromMultipleSites(
    urls: string[],
    schema: z.ZodSchema
): Promise<z.infer<typeof schema>[]> {
    const result = await firecrawl.batchScrapeUrls(urls, {
        formats: ['extract'],
        extract: {
            schema,
            prompt: 'Extract the structured data from this page',
        },
    });

    return result.data
        .filter(doc => doc.extract)
        .map(doc => doc.extract);
}

// Usage
const products = await extractFromMultipleSites(
    [
        'https://store1.com/product/a',
        'https://store2.com/product/b',
        'https://store3.com/product/c',
    ],
    ProductSchema
);
```
