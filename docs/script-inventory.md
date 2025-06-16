# X_BUZZ_FLOW Script Inventory

## Overview
This document provides a comprehensive inventory of all scripts in the X_BUZZ_FLOW project, organized by purpose and status. Scripts are categorized to help with maintenance and cleanup efforts.

**Last Updated**: 2025-06-16

## Directory Structure
- `/scripts/` - Main scripts directory (production-ready scripts)
- `/` (root) - Test scripts and one-off utilities
- `/test-scripts/` - Archived test scripts

## Script Categories

### 1. Development Environment Management 🔧
**Purpose**: Scripts for managing the development environment, servers, and processes

#### Active Scripts
- `scripts/health-check.sh` - **[ACTIVE]** Check development environment status (Next.js, Prisma Studio, DB)
- `scripts/dev-start.sh` - **[ACTIVE]** Start development servers
- `scripts/dev-stop.sh` - **[ACTIVE]** Stop development servers
- `scripts/dev-status.sh` - **[ACTIVE]** Check dev server status
- `scripts/dev-persistent.sh` - **[ACTIVE]** Start persistent development server (recommended)
- `scripts/dev-background.sh` - **[ACTIVE]** Start servers in background
- `scripts/cleanup-ports.sh` - **[ACTIVE]** Clean up stuck ports
- `scripts/session-save.sh` - **[ACTIVE]** Save current session state
- `scripts/session-restore.sh` - **[ACTIVE]** Restore session state
- `scripts/setup-vercel-env.sh` - **[ACTIVE]** Setup Vercel environment variables

#### Deprecated
- `start-dev.sh` - **[DEPRECATED]** Use scripts/dev-start.sh instead

### 2. Logging and Monitoring 📊
**Purpose**: Scripts for logging, monitoring, and diagnostics

#### Active Scripts
- `scripts/auto_log_updater.sh` - **[ACTIVE]** Auto-update work logs
- `scripts/log_manager.sh` - **[ACTIVE]** Manage log files
- `scripts/log_timer.sh` - **[ACTIVE]** Log timing utilities
- `scripts/start_auto_log.sh` - **[ACTIVE]** Start auto logging
- `scripts/stop_auto_log.sh` - **[ACTIVE]** Stop auto logging
- `scripts/create_log_script.sh` - **[ACTIVE]** Create new log scripts
- `scripts/diagnose-error.sh` - **[ACTIVE]** Diagnose errors
- `scripts/diagnose-session.js` - **[ACTIVE]** Diagnose CoT session issues
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES

### 3. Database Management 🗄️
**Purpose**: Scripts for database operations, migrations, and maintenance

#### Active Scripts
- `scripts/db-admin.js` - **[ACTIVE]** Database administration utility
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES
- `scripts/migrate-cot-tables.js` - **[ACTIVE]** Migrate CoT tables
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES
- `scripts/migrate-cot-complete.js` - **[ACTIVE]** Complete CoT migration
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES
- `scripts/create-api-task-tables.js` - **[ACTIVE]** Create API task tables
  - Dependencies: Prisma DB
- `scripts/create-cot-tables.js` - **[ACTIVE]** Create CoT tables
  - Dependencies: Prisma DB
- `scripts/test-db-connection.js` - **[ACTIVE]** Test database connection
  - Dependencies: Prisma DB

#### Migration Scripts
- `scripts/migrate-prod.js` - **[ACTIVE]** Production migration script
- `scripts/migrate-production.sh` - **[ACTIVE]** Production migration shell script
- `scripts/run-migration.js` - **[ACTIVE]** Run migrations
- `scripts/run-migration-new-schema.js` - **[ACTIVE]** Run new schema migrations
- `scripts/run-cot-migration.js` - **[ACTIVE]** Run CoT migrations
- `scripts/supabase-migrate.js` - **[ACTIVE]** Supabase-specific migrations

#### Deprecated
- `scripts/migrate-cot-local.js` - **[DEPRECATED]** Use migrate-cot-complete.js
- `scripts/migrate-cot-pooler.js` - **[DEPRECATED]** Use migrate-cot-complete.js
- `scripts/migrate-gpt-tables.js` - **[DEPRECATED]** Old GPT table migration

### 4. Chain of Thought (CoT) Management 🤖
**Purpose**: Scripts for managing CoT sessions, debugging, and testing

#### Active Scripts
- `scripts/check-cot-sessions.js` - **[ACTIVE]** Check CoT session status
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES
- `scripts/cot-debug.js` - **[ACTIVE]** Debug CoT sessions
  - Dependencies: Prisma DB, OpenAI API
  - Uses expertise field: ✅ YES
- `scripts/cot-resume.js` - **[ACTIVE]** Resume stuck CoT sessions
  - Dependencies: Prisma DB
  - Uses expertise field: ✅ YES
- `scripts/cot-test-phase.js` - **[ACTIVE]** Test specific CoT phases
  - Dependencies: Prisma DB, OpenAI API
  - Uses expertise field: ✅ YES
- `scripts/recover-stuck-sessions.js` - **[ACTIVE]** Recover stuck sessions
  - Dependencies: Prisma DB
- `scripts/reset-session-state.js` - **[ACTIVE]** Reset session state
  - Dependencies: Prisma DB
- `scripts/reset-session-to-pending.js` - **[ACTIVE]** Reset session to pending
  - Dependencies: Prisma DB
- `scripts/cleanup-sessions.js` - **[ACTIVE]** Clean up old/failed sessions
  - Dependencies: Prisma DB
- `scripts/quick-test-integrate.sh` - **[ACTIVE]** Quick test for integrate step

#### Phase Analysis Scripts
- `scripts/check-phase-results.js` - **[ACTIVE]** Check phase results
  - Uses expertise field: ✅ YES
- `scripts/check-phase2-concepts.js` - **[ACTIVE]** Check Phase 2 concepts
- `scripts/check-phase2-urls.js` - **[ACTIVE]** Check Phase 2 URLs
- `scripts/check-phase3-urls.js` - **[ACTIVE]** Check Phase 3 URLs
- `scripts/check-db-phases.js` - **[ACTIVE]** Check DB phase data
  - Uses expertise field: ✅ YES
- `scripts/check-session-detail.js` - **[ACTIVE]** Check session details
  - Uses expertise field: ✅ YES
- `scripts/check-session-completion.js` - **[ACTIVE]** Check session completion
- `scripts/show-draft-content.js` - **[ACTIVE]** Show draft content
- `scripts/show-perplexity-data.js` - **[ACTIVE]** Show Perplexity data
  - Uses expertise field: ✅ YES

#### Session Finding Scripts
- `scripts/find-recent-sessions.js` - **[ACTIVE]** Find recent sessions
  - Uses expertise field: ✅ YES
- `scripts/find-phase1-completed.js` - **[ACTIVE]** Find Phase 1 completed sessions
  - Uses expertise field: ✅ YES
- `scripts/find-perplexity-sessions.js` - **[ACTIVE]** Find Perplexity sessions
  - Uses expertise field: ✅ YES

### 5. Async Processing & Workers 🔄
**Purpose**: Background workers and async task processing

#### Active Scripts
- `scripts/async-worker-v2.js` - **[ACTIVE]** Version 2 async worker for API tasks
  - Dependencies: Prisma DB, OpenAI API, Perplexity API
  - Uses expertise field: ✅ YES
- `scripts/async-worker.js` - **[DEPRECATED]** Use async-worker-v2.js

### 6. Data Collection & Analysis 📊
**Purpose**: Scripts for collecting and analyzing data from various sources

#### News Collection Scripts
- `scripts/check-news-data.ts` - **[ACTIVE]** Check news data
  - Dependencies: Prisma DB
- `scripts/seed-news-sources.ts` - **[ACTIVE]** Seed news sources
  - Dependencies: Prisma DB
- `scripts/seed-all-sources.ts` - **[ACTIVE]** Seed all data sources
  - Dependencies: Prisma DB

#### Social Media Collection
- `scripts/check-buzz-posts.js` - **[ACTIVE]** Check buzz posts
  - Dependencies: Prisma DB
- `scripts/check-specific-post.js` - **[ACTIVE]** Check specific post details
  - Dependencies: Prisma DB
- `scripts/clear-buzz-posts.js` - **[UTILITY]** Clear buzz posts
- `scripts/clear-all-posts.js` - **[UTILITY]** Clear all posts
- `scripts/clear-test-posts.js` - **[UTILITY]** Clear test posts
- `scripts/clear-watchlist.js` - **[UTILITY]** Clear watchlist
- `scripts/cleanup-irrelevant-posts.js` - **[UTILITY]** Clean up irrelevant posts

#### Analytics
- `scripts/check-analytics-data.js` - **[ACTIVE]** Check analytics data
  - Dependencies: Prisma DB
- `scripts/analyze-kaito-results.js` - **[ACTIVE]** Analyze Kaito API results
- `scripts/analyze-perplexity-response.js` - **[ACTIVE]** Analyze Perplexity responses

### 7. Preset Management 🎯
**Purpose**: Scripts for managing content generation presets

#### Active Scripts
- `scripts/check-presets.js` - **[ACTIVE]** Check current presets
- `scripts/check-presets-current.js` - **[ACTIVE]** Check current active presets
- `scripts/update-presets.js` - **[ACTIVE]** Update presets
- `scripts/optimize-presets.js` - **[ACTIVE]** Optimize preset performance
- `scripts/simplify-presets.js` - **[UTILITY]** Simplify complex presets

#### Preset Creation Scripts (May need expertise updates)
- `scripts/create-buzz-presets.js` - **[ARCHIVE]** Original buzz presets
- `scripts/create-buzz-presets-v2.js` - **[ARCHIVE]** Version 2 buzz presets
- `scripts/create-balanced-presets.js` - **[ARCHIVE]** Balanced presets
- `scripts/create-balanced-auto-presets.js` - **[ARCHIVE]** Auto-balanced presets
- `scripts/create-smart-presets.js` - **[ARCHIVE]** Smart presets
- `scripts/create-optimized-presets.js` - **[ARCHIVE]** Optimized presets
- `scripts/create-realistic-presets.js` - **[ARCHIVE]** Realistic presets
- `scripts/create-prompt-focused-presets.js` - **[ARCHIVE]** Prompt-focused presets
- `scripts/create-auto-manual-presets.js` - **[ARCHIVE]** Auto/manual presets
- `scripts/create-work-change-presets.js` - **[ARCHIVE]** Work change presets
- `scripts/create-job-replacement-presets.js` - **[ARCHIVE]** Job replacement presets
- `scripts/create-ai-patterns.js` - **[ARCHIVE]** AI pattern presets
- `scripts/add-buzz-patterns.js` - **[ARCHIVE]** Add buzz patterns

### 8. Testing Scripts 🧪
**Purpose**: Scripts for testing various system components

#### CoT Testing (Active)
- `scripts/test-cot-flow.js` - **[ACTIVE]** Test complete CoT flow
  - Uses expertise field: ✅ YES
- `scripts/test-full-flow.js` - **[ACTIVE]** Test full system flow
- `scripts/test-create-flow.js` - **[ACTIVE]** Test create flow
- `scripts/test-db-phase1.js` - **[ACTIVE]** Test Phase 1 DB operations
  - Uses expertise field: ✅ YES
- `scripts/test-phase2-integrate-fix.js` - **[ACTIVE]** Test Phase 2 integrate fix
  - Uses expertise field: ✅ YES
- `scripts/test-phase2-manual.js` - **[ACTIVE]** Manual Phase 2 testing
  - Uses expertise field: ✅ YES

#### API Testing
- `scripts/test-api.js` - **[ACTIVE]** Test API endpoints
- `scripts/test-claude-api.ts` - **[ACTIVE]** Test Claude API
- `scripts/test-kaito-api.js` - **[ACTIVE]** Test Kaito API
- `scripts/test-kaito-direct.js` - **[ACTIVE]** Test Kaito direct access
- `scripts/test-kaito-simple.js` - **[ACTIVE]** Simple Kaito test
- `scripts/test-kaito-queries.js` - **[ACTIVE]** Test Kaito queries

#### Perplexity Testing
- `scripts/test-perplexity-parsing.js` - **[ACTIVE]** Test Perplexity parsing
- `scripts/test-new-perplexity.js` - **[ACTIVE]** Test new Perplexity features
- `scripts/check-perplexity-data.js` - **[ACTIVE]** Check Perplexity data
- `scripts/check-perplexity-urls.js` - **[ACTIVE]** Check Perplexity URLs

#### Other Testing
- `scripts/test-improved-parsing.js` - **[ACTIVE]** Test improved parsing
- `scripts/test-simple-collect.js` - **[ACTIVE]** Test simple collection
- `scripts/test-real-search.js` - **[ACTIVE]** Test real search
- `scripts/test-preset-searches.js` - **[ACTIVE]** Test preset searches
- `scripts/test-specific-queries.js` - **[ACTIVE]** Test specific queries

### 9. Database Maintenance 🔧
**Purpose**: Scripts for database fixes and cleanup

#### Active Scripts
- `scripts/fix-db-columns.js` - **[UTILITY]** Fix database columns
- `scripts/cleanup-duplicate-columns.js` - **[UTILITY]** Clean up duplicate columns
- `scripts/check-user-columns.js` - **[UTILITY]** Check user columns
- `scripts/fix-perplexity-reports.js` - **[UTILITY]** Fix Perplexity reports
- `scripts/check-db-status.js` - **[ACTIVE]** Check database status
- `scripts/create-draft-manually.js` - **[UTILITY]** Manually create drafts

### 10. External API Management 🌐
**Purpose**: Scripts for managing external API integrations

#### Active Scripts
- `scripts/check-apify-dataset.js` - **[ACTIVE]** Check Apify dataset
- `scripts/fix-kaito-and-optimize-queries.js` - **[UTILITY]** Fix Kaito queries
- `scripts/import-my-tweets-bulk.js` - **[UTILITY]** Bulk import tweets

#### Deprecated
- `scripts/check-twitter-sources.ts.bak` - **[DEPRECATED]** Backup file
- `scripts/disable-twitter-sources.ts.bak` - **[DEPRECATED]** Backup file
- `scripts/delete-ai-community-tweets.ts` - **[DEPRECATED]** Old cleanup script

### 11. Root Directory Test Scripts 📁
**Purpose**: One-off test scripts in the root directory

#### Active Test Scripts (May be moved to test-scripts/)
- `test-cot-local.js` - Test CoT locally (Uses expertise: ✅)
- `test-cot-context.js` - Test CoT context (Uses expertise: ✅)
- `test-cot-detailed.js` - Detailed CoT test (Uses expertise: ✅)
- `test-cot-output-validation.js` - Validate CoT output (Uses expertise: ✅)
- `test-cot-with-logs.js` - CoT test with logging (Uses expertise: ✅)
- `test-cot-no-recovery.js` - Test without recovery (Uses expertise: ✅)
- `test-real-cot.js` - Real CoT test (Uses expertise: ✅)
- `test-async-cot.js` - Async CoT test (Uses expertise: ✅)
- `test-sync-cot.js` - Sync CoT test (Uses expertise: ✅)
- `test-recovery.js` - Test recovery mechanisms (Uses expertise: ✅)

#### Phase-Specific Test Scripts
- `test-phase1-*.js` - Various Phase 1 tests (Uses expertise: ✅)
- `test-phase2-*.js` - Phase 2 tests (Uses expertise: ✅)
- `test-phase3-*.js` - Phase 3 tests
- `test-integrate-*.js` - Integration tests (Uses expertise: ✅)

#### API Test Scripts
- `test-perplexity*.js` - Perplexity API tests
- `test-google-search*.js` - Google Search tests
- `test-twitter-*.js` - Twitter API tests
- `test-openai-*.js` - OpenAI tests

#### Other Test Scripts
- `check-*.js` - Various check scripts
- `show-*.js` - Display scripts
- `list-*.js` - Listing scripts
- `debug-*.js` - Debug scripts
- `create-*.js` - Creation scripts
- `fix-*.js` - Fix scripts
- `reset-*.js` - Reset scripts
- `complete-*.js` - Completion scripts

### 12. SQL Scripts 📄
**Purpose**: Direct SQL scripts for database operations

- `create-gpt-tables.sql` - Create GPT tables
- `create-missing-tables.sql` - Create missing tables
- `fix-users-columns.sql` - Fix user columns
- `fix-users-table.sql` - Fix users table
- `scripts/fix-threadcontent-column.sql` - Fix thread content column

## Scripts Using "expertise" Field 🎯

The following scripts use the "expertise" field and may need updates when the system transitions away from hardcoded expertise:

### High Priority (Core functionality)
1. `scripts/async-worker-v2.js` - Main async worker
2. `scripts/cot-debug.js` - CoT debugging
3. `scripts/cot-resume.js` - Resume sessions
4. `scripts/cot-test-phase.js` - Test phases
5. `scripts/test-cot-flow.js` - Test complete flow

### Medium Priority (Analysis and monitoring)
1. `scripts/check-cot-sessions.js` - Session status
2. `scripts/diagnose-session.js` - Session diagnostics
3. `scripts/check-phase-results.js` - Phase results
4. `scripts/check-session-detail.js` - Session details
5. `scripts/find-recent-sessions.js` - Find sessions
6. `scripts/find-phase1-completed.js` - Find completed
7. `scripts/find-perplexity-sessions.js` - Find Perplexity

### Low Priority (Database and migration)
1. `scripts/db-admin.js` - DB administration
2. `scripts/migrate-cot-tables.js` - Migrations
3. `scripts/migrate-cot-complete.js` - Complete migration
4. `scripts/test-db-phase1.js` - DB tests

## Recommendations for Cleanup 🧹

### 1. Scripts to Keep
- All active scripts in `/scripts/` directory
- Essential test scripts that are frequently used
- All development environment management scripts
- Active CoT management scripts

### 2. Scripts to Archive
- Old preset creation scripts (create-*-presets.js)
- Version 1 scripts that have v2 equivalents
- Test scripts that are no longer relevant
- Backup files (*.bak)

### 3. Scripts to Delete
- Duplicate scripts with same functionality
- Broken scripts that reference non-existent APIs
- One-off scripts that have served their purpose
- Empty or placeholder scripts

### 4. Scripts to Refactor
- Scripts using hardcoded "expertise" field
- Scripts with duplicate functionality
- Scripts that could be combined into utilities

## Maintenance Guidelines 📋

1. **New Scripts**: Add to `/scripts/` if production-ready, otherwise use `/test-scripts/`
2. **Naming Convention**: Use descriptive names with action-verb prefix (e.g., check-, test-, create-)
3. **Documentation**: Add purpose comment at top of each script
4. **Dependencies**: Clearly document which APIs/DBs are required
5. **Status Updates**: Update this inventory when adding/removing scripts

## Script Statistics 📊

- **Total Scripts**: ~200+
- **Active Production Scripts**: ~80
- **Test Scripts**: ~100+
- **Scripts Using expertise**: ~75
- **Deprecated Scripts**: ~20
- **SQL Scripts**: 6

## Next Steps 🚀

1. Move all test scripts from root to `/test-scripts/`
2. Archive old preset creation scripts
3. Update scripts using "expertise" field
4. Consolidate duplicate functionality
5. Create unified test suite
6. Document script dependencies better