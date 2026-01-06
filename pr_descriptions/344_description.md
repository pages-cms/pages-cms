# Implement public_join_token Database Schema with Comprehensive Testing

This PR adds the `public_join_token` table to the PagesCMS database to support public join tokens for repository collaboration. The implementation includes the complete Drizzle schema definition, SQL migration, and comprehensive testing infrastructure for local and staging environments.

## Key changes

- **Database Schema**: Added `publicJoinTokenTable` to `db/schema.ts` with all required fields (id, token, owner, repo, installationId, ownerId, repoId, type, createdBy, expiresAt, usageLimit, usageCount, createdAt)
- **Migration**: Created Drizzle migration `0003_clean_forgotten_one.sql` with proper constraints (unique token, NOT NULL on required fields, default values)
- **Indexes**: Implemented unique index on token column for fast lookups and composite index on (owner, repo) for query optimization
- **Testing Suite**: Created comprehensive SQL test suite (`db/tests/test_public_join_token_schema.sql`) with 14 tests covering schema validation, constraint enforcement, and index performance
- **Documentation**: Added detailed test execution guide in `db/tests/README.md` with local and staging instructions
- **Staging Validation**: Created staging environment validation script (`db/tests/validate_staging.sh`) with automated performance benchmarking
- **Task Master Integration**: Initialized Task Master AI configuration with complexity analysis for future token feature tasks

## How to test

### Automated Tests

```bash
# From pagescms directory
cd pagescms

# Run database migration (local environment)
npm run db:migrate

# Run schema validation tests
psql "$DATABASE_URL" -f db/tests/test_public_join_token_schema.sql

# Expected output: All 14 tests should show ✓ PASS
```

### Manual Testing

1. **Verify migration applied**:
   ```bash
   psql "$DATABASE_URL" -c "\dt public_join_token"
   psql "$DATABASE_URL" -c "\d+ public_join_token"
   ```

2. **Test data insertion**:
   ```sql
   INSERT INTO public_join_token (
     token, owner, repo, type, created_by, expires_at, usage_limit, created_at
   ) VALUES (
     'test_token_12345', 'owner', 'repo', 'admin', 'user@example.com',
     NOW() + INTERVAL '30 days', 100, NOW()
   );
   ```

3. **Verify unique constraint**:
   ```sql
   -- Should fail with unique constraint violation
   INSERT INTO public_join_token (token, owner, repo, type, created_by, expires_at, usage_limit, created_at)
   VALUES ('test_token_12345', 'owner', 'repo', 'admin', 'user@example.com', NOW() + INTERVAL '30 days', 100, NOW());
   ```

4. **Verify default value on usage_count**:
   ```sql
   INSERT INTO public_join_token (token, owner, repo, type, created_by, expires_at, usage_limit, created_at)
   VALUES ('new_token', 'owner', 'repo', 'admin', 'user@example.com', NOW() + INTERVAL '30 days', 100, NOW());

   SELECT usage_count FROM public_join_token WHERE token = 'new_token';
   -- Expected: 0
   ```

5. **Staging environment validation** (requires staging DATABASE_URL):
   ```bash
   cd db/tests
   ./validate_staging.sh
   ```

### Integration Tests

- Verify migration applies cleanly to fresh database
- Test migration rollback capability (Drizzle handles this)
- Validate indexes with EXPLAIN ANALYZE on sample queries
- Test concurrent access patterns (multiple inserts, lookups)

## Risk Assessment

**Low Risk**

- Isolated schema change (new table, no modifications to existing tables)
- Migration is additive only (no data loss risk)
- Comprehensive test coverage validates all constraints and indexes
- Staging validation script catches environment-specific issues
- No breaking changes to existing API or application logic

**Mitigations**:
- Unique constraint on token prevents duplicate tokens
- NOT NULL constraints enforced at database level
- Default value on usage_count prevents application errors
- Indexes tested for performance under realistic load
- Automated tests ensure schema correctness before deployment

## Checklist

- [x] Schema definition added to `db/schema.ts`
- [x] Migration generated with Drizzle Kit
- [x] Unique constraint on token field
- [x] Composite index on (owner, repo) for query optimization
- [x] NOT NULL constraints on all required fields
- [x] Default value (0) on usage_count field
- [x] Comprehensive SQL test suite (14 tests)
- [x] Documentation for local testing
- [x] Staging environment validation script
- [x] Performance benchmarking for indexes
- [x] Task Master AI configuration for future tasks
- [x] No breaking changes to existing tables
- [x] Secrets redacted (none present in diff)
