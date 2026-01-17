# Secrets Manager for application secrets
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "greenleaf/${var.environment}/app"
  description = "Application secrets for GreenLeaf ${var.environment}"

  tags = {
    Name = "greenleaf-${var.environment}-secrets"
  }
}

# Note: Secret values should be set manually via AWS Console or CLI
# aws secretsmanager put-secret-value --secret-id greenleaf/prod/app --secret-string '{
#   "DATABASE_URL": "postgresql://...",
#   "STRIPE_SECRET_KEY": "sk_test_...",
#   "STRIPE_WEBHOOK_SECRET": "whsec_...",
#   "OPENAI_API_KEY": "sk-proj-...",
#   "FIRECRAWL_API_KEY": "fc-..."
# }'
