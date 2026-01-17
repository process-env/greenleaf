# GreenLeaf Dispensary

A production-ready cannabis store portfolio monorepo showcasing senior-level architecture: Next.js 15 storefront, Firecrawl inventory scraping, LangChain AI budtender, Stripe checkout, deployed on AWS ECS Fargate.

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes + tRPC for type-safety
- **Database**: PostgreSQL (AWS RDS) + Prisma ORM + pgvector
- **AI**: LangChain.js + OpenAI GPT-4 + vector embeddings
- **Payments**: Stripe (test mode)
- **Scraping**: Firecrawl for strain data
- **Infra**: AWS ECS Fargate, RDS, ECR, ALB, CloudFront

## Project Structure

```
greenleaf/
├── apps/
│   ├── web/                 # Next.js 15 storefront
│   └── scraper/             # Firecrawl scraper service
├── packages/
│   ├── db/                  # Prisma schema + client
│   ├── ai/                  # LangChain budtender
│   ├── ui/                  # Shared UI components
│   └── config/              # Shared configs (eslint, typescript, tailwind)
├── infra/                   # AWS Terraform infrastructure
├── docker-compose.yml       # Local development
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for local PostgreSQL)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/greenleaf.git
cd greenleaf
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. Start the database:
```bash
docker-compose up -d postgres
```

5. Run database migrations:
```bash
pnpm db:push
```

6. Seed the database:
```bash
pnpm seed
```

7. Generate embeddings (requires OpenAI API key):
```bash
pnpm --filter @greenleaf/scraper embed
```

8. Start the development server:
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## Features

### Strain Catalog
- Browse premium cannabis strains
- Filter by type (Indica, Sativa, Hybrid)
- Filter by effects and THC/CBD levels
- Vector similarity search

### AI Budtender
- Chat with an AI-powered budtender
- Get personalized strain recommendations
- RAG-powered responses using strain embeddings
- Streaming chat responses

### Shopping Cart & Checkout
- Session-based shopping cart
- Add strains with custom quantities
- Stripe-powered checkout (test mode)
- Webhook-based order fulfillment

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run linting |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm scrape` | Run Firecrawl scraper |
| `pnpm seed` | Seed database with strains |

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/greenleaf

# Stripe (test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Firecrawl
FIRECRAWL_API_KEY=fc-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Deployment

### AWS Infrastructure

The `/infra` directory contains Terraform configurations for:
- VPC with public/private subnets
- ECS Fargate cluster with auto-scaling
- RDS PostgreSQL with pgvector
- Application Load Balancer
- CloudFront CDN
- Secrets Manager

Deploy infrastructure:
```bash
cd infra
terraform init
terraform plan
terraform apply
```

### Docker

Build and push to ECR:
```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t greenleaf -f apps/web/Dockerfile .
docker tag greenleaf:latest <ecr-repo-url>:latest
docker push <ecr-repo-url>:latest
```

## Architecture Highlights

- **Type-safe end-to-end**: tRPC provides full type safety from database to UI
- **AI-powered recommendations**: LangChain + pgvector for semantic search
- **Production-ready**: Docker, Terraform, auto-scaling, health checks
- **Clean architecture**: Monorepo with shared packages
- **Modern stack**: Next.js 15, React 19, Tailwind CSS

## License

MIT
