# Database Migration Tests

This directory contains SQL test scripts to validate database migrations.

## public_join_token Schema Tests

### Purpose

Tests the `public_join_token` table schema, including:
- Table structure validation
- Constraint enforcement (unique, not null, primary key)
- Index creation and performance
- Data integrity checks

### Running Tests Locally

#### Prerequisites

1. Ensure PostgreSQL is running locally
2. Ensure the database has been migrated with the latest schema

#### Run Tests

```bash
# From the repository root
cd pagescms

# Set up database connection
export DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Run migration first (if not already applied)
npm run db:migrate

# Run the test script
psql "$DATABASE_URL" -f db/tests/test_public_join_token_schema.sql
```

#### Expected Output

All tests should show `✓ PASS` messages. Any `✗ FAIL` indicates a schema problem.

### Test Coverage

| Test | Description |
|------|-------------|
| 1 | Verify table exists |
| 2 | Verify all columns exist with correct types |
| 3 | Verify id is serial primary key |
| 4 | Verify token has unique constraint |
| 5 | Verify non-null constraints on required fields |
| 6 | Verify default value on usage_count |
| 7 | Verify unique index on token |
| 8 | Verify composite index on (owner, repo) |
| 9 | Test INSERT with valid data |
| 10 | Test unique constraint on token (should fail) |
| 11 | Test NOT NULL constraint on token (should fail) |
| 12 | Test default value on usage_count |
| 13 | Verify index performance (token lookup) |
| 14 | Verify composite index performance (owner/repo lookup) |

### Running in Staging

To validate in the staging environment:

```bash
# Set staging database connection
export DATABASE_URL="postgresql://user:password@staging-host:5432/dbname"

# Run tests
psql "$DATABASE_URL" -f db/tests/test_public_join_token_schema.sql
```

### Troubleshooting

#### Connection Issues

If you can't connect to the database:
```bash
# Check PostgreSQL is running
pg_isready

# Test connection
psql -h localhost -U username -d dbname
```

#### Migration Not Applied

If tests fail because the table doesn't exist:
```bash
# Apply migrations
npm run db:migrate

# Verify migration
psql "$DATABASE_URL" -c "\dt public_join_token"
```

#### Permission Issues

Ensure your database user has CREATE TABLE permission:
```sql
-- Check permissions
SELECT * FROM information_schema.role_table_grants
WHERE table_name = 'public_join_token';
```

## Adding New Tests

When adding new migrations, create corresponding test scripts in this directory following the naming convention:

```
test_{table_name}_schema.sql
```

Include tests for:
1. Schema validation (columns, types, constraints)
2. Index verification
3. Data integrity (valid and invalid INSERT attempts)
4. Performance verification (EXPLAIN ANALYZE)
