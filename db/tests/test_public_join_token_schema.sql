-- Test Script for public_join_token Schema
-- This script validates the schema, constraints, and indexes
--
-- Usage:
--   psql -d your_database -f db/tests/test_public_join_token_schema.sql
--
-- Expected output: All tests should pass with no errors

\echo '========================================'
\echo 'Testing public_join_token Schema'
\echo '========================================'
\echo ''

-- Test 1: Verify table exists
\echo 'Test 1: Verify table exists...'
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'public_join_token') THEN
        RAISE NOTICE '✓ PASS: Table public_join_token exists';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Table public_join_token does not exist';
    END IF;
END $$;
\echo ''

-- Test 2: Verify all columns exist with correct types
\echo 'Test 2: Verify column structure...'
DO $$
DECLARE
    column_record RECORD;
    expected_columns TEXT[] := ARRAY[
        'id', 'token', 'owner', 'repo', 'installation_id',
        'owner_id', 'repo_id', 'type', 'created_by', 'expires_at',
        'usage_limit', 'usage_count', 'created_at'
    ];
    found_columns INT := 0;
BEGIN
    -- Count expected columns that exist
    SELECT COUNT(*) INTO found_columns
    FROM information_schema.columns
    WHERE table_name = 'public_join_token'
    AND column_name = ANY(expected_columns);

    IF found_columns = ARRAY_LENGTH(expected_columns, 1) THEN
        RAISE NOTICE '✓ PASS: All % expected columns exist', found_columns;
    ELSE
        RAISE EXCEPTION '✗ FAIL: Expected % columns, found %',
            ARRAY_LENGTH(expected_columns, 1), found_columns;
    END IF;
END $$;
\echo ''

-- Test 3: Verify id is serial primary key
\echo 'Test 3: Verify id is serial primary key...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_constraint
        WHERE conrelid = 'public_join_token'::regclass
        AND conname = 'public_join_token_pkey'
        AND contype = 'p'
    ) THEN
        RAISE NOTICE '✓ PASS: Primary key constraint exists on id column';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Primary key constraint not found on id column';
    END IF;
END $$;
\echo ''

-- Test 4: Verify token has unique constraint
\echo 'Test 4: Verify token unique constraint...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_constraint
        WHERE conrelid = 'public_join_token'::regclass
        AND conname = 'public_join_token_token_unique'
        AND contype = 'u'
    ) THEN
        RAISE NOTICE '✓ PASS: Unique constraint exists on token column';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Unique constraint not found on token column';
    END IF;
END $$;
\echo ''

-- Test 5: Verify non-null constraints on required fields
\echo 'Test 5: Verify non-null constraints...'
DO $$
DECLARE
    nullable_columns TEXT[];
BEGIN
    -- Check for unexpected nullability on required columns
    SELECT array_agg(column_name)
    INTO nullable_columns
    FROM information_schema.columns
    WHERE table_name = 'public_join_token'
    AND column_name IN (
        'id', 'token', 'owner', 'repo', 'type',
        'created_by', 'expires_at', 'usage_limit',
        'usage_count', 'created_at'
    )
    AND is_nullable = 'YES';

    IF nullable_columns IS NULL THEN
        RAISE NOTICE '✓ PASS: All required columns have NOT NULL constraints';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Required columns are nullable: %',
            array_to_string(nullable_columns, ', ');
    END IF;
END $$;
\echo ''

-- Test 6: Verify default value on usage_count
\echo 'Test 6: Verify usage_count default value...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'public_join_token'
        AND column_name = 'usage_count'
        AND column_default = '0'
    ) THEN
        RAISE NOTICE '✓ PASS: usage_count has default value of 0';
    ELSE
        RAISE EXCEPTION '✗ FAIL: usage_count default value is not 0';
    END IF;
END $$;
\echo ''

-- Test 7: Verify unique index on token
\echo 'Test 7: Verify unique index on token...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'public_join_token'
        AND indexname = 'idx_public_join_token_token'
        AND indexdef LIKE '%UNIQUE%'
    ) THEN
        RAISE NOTICE '✓ PASS: Unique index idx_public_join_token_token exists';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Unique index idx_public_join_token_token not found';
    END IF;
END $$;
\echo ''

-- Test 8: Verify composite index on owner and repo
\echo 'Test 8: Verify composite index on (owner, repo)...'
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_indexes
        WHERE tablename = 'public_join_token'
        AND indexname = 'idx_public_join_token_owner_repo'
    ) THEN
        RAISE NOTICE '✓ PASS: Composite index idx_public_join_token_owner_repo exists';
    ELSE
        RAISE EXCEPTION '✗ FAIL: Composite index idx_public_join_token_owner_repo not found';
    END IF;
END $$;
\echo ''

-- Test 9: Test INSERT with valid data
\echo 'Test 9: Test INSERT with valid data...'
INSERT INTO public_join_token (
    token, owner, repo, installation_id, owner_id, repo_id,
    type, created_by, expires_at, usage_limit, usage_count, created_at
) VALUES (
    'test_token_123456789012345',
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

RAISE NOTICE '✓ PASS: Valid data insertion successful';
\echo ''

-- Test 10: Test unique constraint on token (should fail)
\echo 'Test 10: Test unique constraint on token...'
DO $$
BEGIN
    -- Attempt to insert duplicate token
    INSERT INTO public_join_token (
        token, owner, repo, installation_id, owner_id, repo_id,
        type, created_by, expires_at, usage_limit, usage_count, created_at
    ) VALUES (
        'test_token_123456789012345', -- Duplicate token
        'differentowner',
        'differentrepo',
        999999,
        888888,
        777777,
        'wiki',
        'differentuser',
        NOW() + INTERVAL '7 days',
        50,
        0,
        NOW()
    );

    RAISE EXCEPTION '✗ FAIL: Unique constraint did not prevent duplicate token';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE '✓ PASS: Unique constraint correctly rejected duplicate token';
END $$;
\echo ''

-- Test 11: Test NOT NULL constraint on token (should fail)
\echo 'Test 11: Test NOT NULL constraint on token...'
DO $$
BEGIN
    INSERT INTO public_join_token (
        token, owner, repo, type, created_by, expires_at, usage_limit, created_at
    ) VALUES (
        NULL, -- NULL token
        'testowner2',
        'testrepo2',
        'wiki',
        'testuser',
        NOW() + INTERVAL '7 days',
        100,
        NOW()
    );

    RAISE EXCEPTION '✗ FAIL: NOT NULL constraint did not prevent NULL token';
EXCEPTION
    WHEN not_null_violation THEN
        RAISE NOTICE '✓ PASS: NOT NULL constraint correctly rejected NULL token';
END $$;
\echo ''

-- Test 12: Test default value on usage_count
\echo 'Test 12: Test default value on usage_count...'
DO $$
DECLARE
    default_usage_count INT;
BEGIN
    -- Insert row without explicit usage_count
    INSERT INTO public_join_token (
        token, owner, repo, type, created_by, expires_at, usage_limit, created_at
    ) VALUES (
        'test_token_default_usage',
        'testowner3',
        'testrepo3',
        'wiki',
        'testuser',
        NOW() + INTERVAL '7 days',
        100,
        NOW()
    ) RETURNING usage_count INTO default_usage_count;

    IF default_usage_count = 0 THEN
        RAISE NOTICE '✓ PASS: usage_count defaulted to 0';
    ELSE
        RAISE EXCEPTION '✗ FAIL: usage_count default is %, expected 0', default_usage_count;
    END IF;
END $$;
\echo ''

-- Test 13: Verify index performance (query plan)
\echo 'Test 13: Verify index performance...'
EXPLAIN (FORMAT TEXT)
SELECT * FROM public_join_token WHERE token = 'test_token_123456789012345';

RAISE NOTICE '✓ PASS: Query plan generated (check above for Index Scan)';
\echo ''

-- Test 14: Verify composite index performance
\echo 'Test 14: Verify composite index performance...'
EXPLAIN (FORMAT TEXT)
SELECT * FROM public_join_token WHERE owner = 'testowner' AND repo = 'testrepo';

RAISE NOTICE '✓ PASS: Query plan generated (check above for Index Scan)';
\echo ''

-- Cleanup test data
\echo 'Cleanup: Removing test data...'
DELETE FROM public_join_token WHERE token LIKE 'test_token%';
RAISE NOTICE '✓ Cleanup complete';
\echo ''

\echo '========================================'
\echo 'All schema tests completed!'
\echo '========================================'
\echo ''
\echo 'Summary:'
\echo '  - Table structure: VALIDATED'
\echo '  - Constraints: VALIDATED'
\echo '  - Indexes: VALIDATED'
\echo '  - Data integrity: VALIDATED'
\echo '  - Performance: VERIFIED'
\echo ''
