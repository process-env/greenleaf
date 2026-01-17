-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index function for vector similarity search
-- This will be used by the AI budtender for strain recommendations
