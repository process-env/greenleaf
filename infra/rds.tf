# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "greenleaf-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "greenleaf-${var.environment}-db-subnet"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "greenleaf-${var.environment}-rds-sg"
  description = "Security group for RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "greenleaf-${var.environment}-rds-sg"
  }
}

# RDS Parameter Group (for pgvector)
resource "aws_db_parameter_group" "postgres" {
  family = "postgres16"
  name   = "greenleaf-${var.environment}-postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  tags = {
    Name = "greenleaf-${var.environment}-pg-params"
  }
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = "greenleaf-${var.environment}"

  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.t3.medium"

  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "greenleaf"
  username = "postgres"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.postgres.name

  multi_az               = true
  publicly_accessible    = false
  skip_final_snapshot    = false
  final_snapshot_identifier = "greenleaf-${var.environment}-final-snapshot"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "Mon:04:00-Mon:05:00"

  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  deletion_protection = true

  tags = {
    Name = "greenleaf-${var.environment}-rds"
  }
}

# Enable pgvector extension (needs to be done manually or via Lambda)
# Note: After RDS is created, connect and run: CREATE EXTENSION IF NOT EXISTS vector;
