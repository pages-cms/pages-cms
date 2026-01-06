#!/bin/bash
# Staging Environment Validation Script
# Usage: ./validate_staging.sh [database_url]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Staging Environment Validation"
echo "========================================"
echo ""

# Check for database URL
if [ -z "$1" ]; then
    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}Error: DATABASE_URL not set${NC}"
        echo "Usage: ./validate_staging.sh [database_url]"
        echo "   or: export DATABASE_URL=... && ./validate_staging.sh"
        exit 1
    fi
    DB_URL="$DATABASE_URL"
else
    DB_URL="$1"
fi

echo -e "${YELLOW}Database:${NC} $DB_URL"
echo ""

# Test 1: Connection
echo -e "${YELLOW}Test 1: Database Connection${NC}"
if psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS: Database connection successful${NC}"
else
    echo -e "${RED}✗ FAIL: Cannot connect to database${NC}"
    exit 1
fi
echo ""

# Test 2: Table exists
echo -e "${YELLOW}Test 2: Table Exists${NC}"
TABLE_EXISTS=$(psql "$DB_URL" -tAc "SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'public_join_token');")
if [ "$TABLE_EXISTS" = "t" ]; then
    echo -e "${GREEN}✓ PASS: Table public_join_token exists${NC}"
else
    echo -e "${RED}✗ FAIL: Table public_join_token does not exist${NC}"
    echo "Run migration first: npm run db:migrate"
    exit 1
fi
echo ""

# Test 3: Schema validation
echo -e "${YELLOW}Test 3: Schema Validation${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if psql "$DB_URL" -f "$SCRIPT_DIR/test_public_join_token_schema.sql" 2>&1 | grep -q "PASS"; then
    echo -e "${GREEN}✓ PASS: Schema validation tests passed${NC}"
else
    echo -e "${RED}✗ FAIL: Schema validation tests failed${NC}"
    exit 1
fi
echo ""

# Test 4: Index performance
echo -e "${YELLOW}Test 4: Index Performance Check${NC}"
PLAN_OUTPUT=$(psql "$DB_URL" -tAc "EXPLAIN ANALYZE SELECT * FROM public_join_token WHERE token = 'test_token_123456789012345';")
if echo "$PLAN_OUTPUT" | grep -q "Index Scan"; then
    EXEC_TIME=$(echo "$PLAN_OUTPUT" | grep -oE "Execution Time: [0-9.]+ ms" | grep -oE "[0-9.]+")
    echo -e "${GREEN}✓ PASS: Query uses index scan${NC}"
    echo "  Execution time: ${EXEC_TIME}ms"
else
    echo -e "${RED}✗ FAIL: Query does not use index scan${NC}"
    echo "$PLAN_OUTPUT"
    exit 1
fi
echo ""

# Test 5: Row count
echo -e "${YELLOW}Test 5: Row Count${NC}"
ROW_COUNT=$(psql "$DB_URL" -tAc "SELECT COUNT(*) FROM public_join_token;")
echo -e "${GREEN}✓ INFO: Table has $ROW_COUNT rows${NC}"
echo ""

# Test 6: Table size
echo -e "${YELLOW}Test 6: Table Size${NC}"
TABLE_SIZE=$(psql "$DB_URL" -tAc "SELECT pg_size_pretty(pg_total_relation_size('public_join_token'));")
echo -e "${GREEN}✓ INFO: Table size: $TABLE_SIZE${NC}"
echo ""

# Test 7: Index size
echo -e "${YELLOW}Test 7: Index Usage Statistics${NC}"
psql "$DB_URL" -c "
SELECT
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'public_join_token';
"
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}Validation Complete!${NC}"
echo "========================================"
echo ""
echo "Summary:"
echo "  - Database Connection: OK"
echo "  - Table Structure: VALIDATED"
echo "  - Schema Constraints: VALIDATED"
echo "  - Index Performance: VERIFIED"
echo "  - Current Rows: $ROW_COUNT"
echo "  - Table Size: $TABLE_SIZE"
echo ""
echo -e "${GREEN}✓ All validation checks passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review index performance metrics above"
echo "  2. Monitor query performance in production"
echo "  3. Set up alerts for slow queries"
echo ""
