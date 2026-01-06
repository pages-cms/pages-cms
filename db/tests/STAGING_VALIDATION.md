# Staging Environment Validation Guide

## Overview

This guide provides step-by-step instructions for validating the `public_join_token` migration in a staging environment before production deployment.

## Pre-Deployment Checklist

### 1. Environment Setup

- [ ] Staging database is accessible
- [ ] Database credentials are configured
- [ ] Staging environment matches production configuration
- [ ] Backup of staging database is created (for rollback)

### 2. Migration Deployment

```bash
# SSH into staging server
ssh root@main-server.bisschoff.dev

# Navigate to application directory
cd /home/dokku/pagescms

# Pull latest code
git fetch origin
git checkout origin/main

# Apply migration
dokku run pagescms npm run db:migrate
```

### 3. Schema Validation

Run the full test suite:

```bash
# From the repository root
cd /home/dokku/pagescms

# Execute schema validation tests
dokku run pagescms psql -f db/tests/test_public_join_token_schema.sql
```

**Expected Output**: All 14 tests should pass with `✓ PASS` markers.

## Index Performance Testing

### Test 1: Token Lookup Performance

```sql
-- Enable query logging
SET log_min_duration_statement = 0;

-- Explain token lookup
EXPLAIN ANALYZE
SELECT * FROM public_join_token
WHERE token = 'test_token_123456789012345';

-- Expected: Index Scan using idx_public_join_token_token
-- Cost should be < 10.0 for single row lookup
```

**Acceptance Criteria**:
- Query uses `idx_public_join_token_token` index
- Execution time < 1ms for single row lookup
- Cost estimate < 10.0

### Test 2: Composite Index Performance

```sql
-- Explain owner/repo lookup
EXPLAIN ANALYZE
SELECT * FROM public_join_token
WHERE owner = 'divergenttabletop'
AND repo = 'wiki';

-- Expected: Index Scan using idx_public_join_token_owner_repo
-- Should handle multiple rows efficiently
```

**Acceptance Criteria**:
- Query uses `idx_public_join_token_owner_repo` index
- Execution time scales linearly with row count
- Handles 1000+ rows in < 10ms

### Test 3: Index Only Scans

```sql
-- Test index-only scan for token existence check
EXPLAIN ANALYZE
SELECT EXISTS (
    SELECT 1 FROM public_join_token
    WHERE token = 'test_token_123456789012345'
);

-- Expected: Index Only Scan using idx_public_join_token_token
```

**Acceptance Criteria**:
- Uses `Index Only Scan` (more efficient than regular index scan)
- Execution time < 1ms

### Test 4: Concurrent Insert Performance

```sql
-- Test insert performance with unique constraint enforcement
BEGIN;

INSERT INTO public_join_token (
    token, owner, repo, installation_id, owner_id, repo_id,
    type, created_by, expires_at, usage_limit, usage_count, created_at
) VALUES (
    'perf_test_token_001',
    'testowner',
    'testrepo',
    123456,
    789012,
    345678,
    'wiki',
    'testuser',
    NOW() + INTERVAL '7 days',
    100,
    0,
    NOW()
);

ROLLBACK; -- Cleanup test data
```

**Acceptance Criteria**:
- Insert completes in < 5ms
- Unique constraint check is efficient
- No table scans during insert

## Load Testing

### Scenario 1: High Token Lookup Volume

Simulate 100 concurrent token lookups:

```sql
-- Create test data
INSERT INTO public_join_token (token, owner, repo, type, created_by, expires_at, usage_limit, created_at)
SELECT
    'load_test_' || generate_series(1, 100),
    'testowner',
    'testrepo',
    'wiki',
    'testuser',
    NOW() + INTERVAL '7 days',
    100,
    NOW();

-- Run concurrent lookups (from application layer)
-- Use 10 concurrent connections, each performing 10 lookups

-- Cleanup
DELETE FROM public_join_token WHERE token LIKE 'load_test_%';
```

**Acceptance Criteria**:
- All lookups complete in < 100ms total
- No deadlocks or lock contention
- Database CPU usage < 50%

### Scenario 2: Owner/Repo Query Performance

Test query performance with 10,000 rows:

```sql
-- Create test data
INSERT INTO public_join_token (token, owner, repo, type, created_by, expires_at, usage_limit, created_at)
SELECT
    'bulk_' || generate_series(1, 10000),
    'owner_' || (generate_series % 100),
    'repo_' || (generate_series % 100),
    'wiki',
    'testuser',
    NOW() + INTERVAL '7 days',
    100,
    NOW();

-- Query specific owner/repo
EXPLAIN ANALYZE
SELECT * FROM public_join_token
WHERE owner = 'owner_42'
AND repo = 'repo_42';

-- Cleanup
DELETE FROM public_join_token WHERE token LIKE 'bulk_%';
```

**Acceptance Criteria**:
- Query returns ~100 rows in < 10ms
- Uses index scan, not sequential scan
- Cost estimate scales with result size, not table size

## Data Integrity Validation

### Test 1: Unique Constraint Enforcement

```sql
-- Attempt duplicate token insertion
BEGIN;

INSERT INTO public_join_token (
    token, owner, repo, type, created_by, expires_at, usage_limit, created_at
) VALUES (
    'unique_test_001',
    'owner1',
    'repo1',
    'wiki',
    'user1',
    NOW() + INTERVAL '7 days',
    100,
    NOW()
);

-- This should fail
INSERT INTO public_join_token (
    token, owner, repo, type, created_by, expires_at, usage_limit, created_at
) VALUES (
    'unique_test_001', -- Same token
    'owner2',
    'repo2',
    'wiki',
    'user2',
    NOW() + INTERVAL '7 days',
    50,
    NOW()
);

ROLLBACK;
```

**Expected**: `unique_violation` error on second insert.

### Test 2: NOT NULL Constraint Enforcement

```sql
-- Test all NOT NULL columns
BEGIN;

-- Missing token
INSERT INTO public_join_token (
    owner, repo, type, created_by, expires_at, usage_limit, created_at
) VALUES (
    'owner1', 'repo1', 'wiki', 'user1', NOW() + INTERVAL '7 days', 100, NOW()
);

-- Expected: not_null_violation on token column

ROLLBACK;
```

**Expected**: `not_null_violation` error.

### Test 3: Default Value Verification

```sql
-- Insert without usage_count
INSERT INTO public_join_token (
    token, owner, repo, type, created_by, expires_at, usage_limit, created_at
) VALUES (
    'default_test_001',
    'owner1',
    'repo1',
    'wiki',
    'user1',
    NOW() + INTERVAL '7 days',
    100,
    NOW()
) RETURNING usage_count;

-- Expected: usage_count = 0

-- Cleanup
DELETE FROM public_join_token WHERE token = 'default_test_001';
```

**Expected**: `usage_count` returns `0`.

## Performance Benchmarks

### Target Metrics

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| Token lookup (single) | < 1ms | < 5ms | Primary access pattern |
| Owner/Repo query (100 rows) | < 5ms | < 20ms | Admin listing |
| Token insert | < 5ms | < 15ms | Including constraint check |
| Token update (usage_count) | < 2ms | < 10ms | Increment counter |

### Comparison Testing

Compare performance with and without indexes:

```sql
-- Measure query time with index
\timing on

SELECT * FROM public_join_token WHERE token = 'existing_token';

-- Temporarily drop index (CAUTION: Only in staging!)
DROP INDEX IF EXISTS idx_public_join_token_token;

-- Measure query time without index
SELECT * FROM public_join_token WHERE token = 'existing_token';

-- Recreate index
CREATE UNIQUE INDEX idx_public_join_token_token
ON public_join_token USING btree (token);

-- Compare performance
```

**Expected**: Query with index is 100-1000x faster.

## Rollback Plan

If validation fails:

```bash
# Rollback migration
dokku run pagescms psql -c "
DROP TABLE IF EXISTS public_join_token CASCADE;
DELETE FROM drizzle.schema WHERE name = '0003_clean_forgotten_one';
"

# Verify table is gone
dokku run pagescms psql -c "\dt" | grep public_join_token
# Should return nothing
```

## Production Deployment Approval

Only proceed to production if ALL of the following are true:

- [ ] All 14 schema tests pass
- [ ] Token lookup < 1ms
- [ ] Owner/Repo query < 10ms for 100 rows
- [ ] Unique constraints enforced correctly
- [ ] NOT NULL constraints enforced correctly
- [ ] Default values work correctly
- [ ] No deadlocks under load
- [ ] Index usage confirmed in EXPLAIN ANALYZE
- [ ] Database CPU < 50% during load tests
- [ ] Rollback procedure tested and verified

## Sign-off

After completing validation, record the results:

```
Date: [TIMESTAMP]
Environment: Staging
Database Version: [VERSION]
Migration: 0003_clean_forgotten_one.sql

Test Results:
- Schema Validation: PASS/FAIL
- Performance Tests: PASS/FAIL
- Load Testing: PASS/FAIL
- Data Integrity: PASS/FAIL

Overall Status: APPROVED/NOT APPROVED

Validator: [YOUR NAME]
Notes: [Any observations or concerns]
```

## Monitoring in Production

After production deployment, monitor:

1. **Query Performance**
   ```sql
   -- Slow query log
   SELECT query, calls, total_time, mean_time
   FROM pg_stat_statements
   WHERE query LIKE '%public_join_token%'
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

2. **Index Usage**
   ```sql
   -- Index efficiency
   SELECT
       schemaname,
       tablename,
       indexname,
       idx_scan as index_scans,
       idx_tup_read as tuples_read,
       idx_tup_fetch as tuples_fetched
   FROM pg_stat_user_indexes
   WHERE tablename = 'public_join_token';
   ```

3. **Table Size**
   ```sql
   -- Monitor table growth
   SELECT
       pg_size_pretty(pg_total_relation_size('public_join_token')) as size,
       pg_total_relation_size('public_join_token') as size_bytes
   FROM pg_stat_user_tables
   WHERE relname = 'public_join_token';
   ```

4. **Lock Contention**
   ```sql
   -- Check for blocking queries
   SELECT * FROM pg_stat_activity
   WHERE state = 'active'
   AND query LIKE '%public_join_token%';
   ```
