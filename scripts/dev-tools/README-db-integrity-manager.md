# Database Integrity Manager

A comprehensive tool that ensures complete synchronization between Prisma schema, database, and codebase.

## Features

### 1. Schema as Single Source of Truth
- Parses `prisma/schema.prisma` directly
- Compares schema definitions with actual database state
- Identifies all discrepancies

### 2. Full Integrity Checking
- **Extra tables**: Tables in DB but not in schema
- **Missing tables**: Tables in schema but not in DB
- **Column mismatches**: Missing, extra, or misnamed columns
- **Type mismatches**: Wrong data types
- **Nullability issues**: Optional vs required mismatches
- **Missing/extra indexes**: Index consistency
- **Enum validation**: Missing enums or enum values
- **Duplicate functions**: Same function defined multiple places

### 3. Migration Generation
- Generates SQL migrations for all found issues
- Separates fixes into categories:
  - Table creation
  - Column additions
  - Type alterations
  - Enum fixes
  - Cleanup operations (commented out for safety)

### 4. Module Integration Checking
- Scans `/app/api` and `/lib` directories
- Finds duplicate function definitions
- Helps prevent parameter mismatches

### 5. Safety Features
- Preview all changes before applying
- Automatic database backup
- Detailed reports saved to JSON
- Severity levels (error/warning)

## Usage

```bash
# Run the tool
node scripts/dev-tools/db-integrity-manager.js

# Or make it executable and run directly
./scripts/dev-tools/db-integrity-manager.js
```

## Menu Options

1. **Full Integrity Check**
   - Comprehensive comparison of schema vs database
   - Generates detailed report
   - Saves to `db-integrity-report.json`

2. **Generate Migrations**
   - Creates SQL file with all necessary fixes
   - Organized by type of change
   - Review before applying!

3. **Check Module Duplicates**
   - Finds functions defined in multiple places
   - Helps prevent "function not matching parameters" errors

4. **Apply Fixes**
   - Guides you through applying migrations safely
   - Uses Prisma migrate for proper tracking

5. **Backup Database**
   - Creates timestamped SQL backup
   - Uses pg_dump for full database export

6. **Show Schema Info**
   - Quick overview of models, enums, and database stats

## Example Output

```
🔍 Checking database integrity...

📊 Found 42 models and 8 enums in schema

⚠️  Found 5 issues:

❌ Errors (2):
  - Column 'theme' is defined in model 'ViralSession' but missing in table 'viral_sessions'
  - Type mismatch for 'status' in 'CotSession': expected String but found enum

⚠️  Warnings (3):
  - Table 'old_viral_drafts' exists in database but not in schema
  - Column 'legacy_field' exists in table 'buzz_posts' but not in model 'BuzzPost'
  - Function 'generateContent' has 3 duplicates

📄 Full report saved to db-integrity-report.json
```

## Generated Migration Example

```sql
-- Database Integrity Fixes
-- Generated: 2025-06-20T10:00:00.000Z

-- Missing Columns
ALTER TABLE "viral_sessions" ADD COLUMN "theme" TEXT;

-- Type Fixes
ALTER TABLE "cot_sessions" ALTER COLUMN "status" TYPE TEXT;

-- Cleanup (uncomment to execute)
-- DROP TABLE IF EXISTS "old_viral_drafts";
-- ALTER TABLE "buzz_posts" DROP COLUMN IF EXISTS "legacy_field";
```

## Best Practices

1. **Run regularly**: Check integrity before major deployments
2. **Review migrations**: Always review generated SQL before applying
3. **Backup first**: Use option 5 before applying fixes
4. **Fix root causes**: Don't just apply fixes - understand why mismatches occurred
5. **Use Prisma migrate**: For tracking migration history properly

## Troubleshooting

- **pg_dump not found**: Install PostgreSQL client tools
- **Permission denied**: Check database user permissions
- **Connection failed**: Verify DATABASE_URL environment variable

## Integration with Development Workflow

```bash
# Before starting work
./scripts/dev-tools/db-integrity-manager.js  # Option 1: Check integrity

# After schema changes
npx prisma generate
./scripts/dev-tools/db-integrity-manager.js  # Option 1: Verify changes

# Before deployment
./scripts/dev-tools/db-integrity-manager.js  # Option 5: Backup
./scripts/dev-tools/db-integrity-manager.js  # Option 1: Final check
```