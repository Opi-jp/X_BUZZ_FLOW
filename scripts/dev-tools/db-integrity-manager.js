#!/usr/bin/env node

const { PrismaClient } = require('../../lib/generated/prisma');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { spawn } = require('child_process');
const chalk = require('chalk');

const prisma = new PrismaClient();

// Prisma schema parser
class PrismaSchemaParser {
  constructor(schemaPath) {
    this.schemaPath = schemaPath;
    this.models = new Map();
    this.enums = new Map();
  }

  async parse() {
    const content = await fs.readFile(this.schemaPath, 'utf-8');
    const lines = content.split('\n');
    
    let currentModel = null;
    let currentEnum = null;
    let inModel = false;
    let inEnum = false;
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip comments and empty lines
      if (line.startsWith('//') || line === '') continue;
      
      // Model detection
      if (line.startsWith('model ')) {
        currentModel = {
          name: line.split(' ')[1],
          tableName: null,
          fields: new Map(),
          indexes: [],
          relations: []
        };
        inModel = true;
        braceCount = 0;
        continue;
      }
      
      // Enum detection
      if (line.startsWith('enum ')) {
        currentEnum = {
          name: line.split(' ')[1],
          values: []
        };
        inEnum = true;
        braceCount = 0;
        continue;
      }
      
      // Count braces
      if (line.includes('{')) braceCount++;
      if (line.includes('}')) braceCount--;
      
      // End of model/enum
      if (braceCount === 0 && (inModel || inEnum)) {
        if (inModel && currentModel) {
          this.models.set(currentModel.name, currentModel);
          currentModel = null;
          inModel = false;
        }
        if (inEnum && currentEnum) {
          this.enums.set(currentEnum.name, currentEnum);
          currentEnum = null;
          inEnum = false;
        }
        continue;
      }
      
      // Parse model content
      if (inModel && currentModel) {
        // Table name mapping
        if (line.includes('@@map(')) {
          const match = line.match(/@@map\("([^"]+)"\)/);
          if (match) currentModel.tableName = match[1];
        }
        // Index
        else if (line.includes('@@index(')) {
          const match = line.match(/@@index\(\[([^\]]+)\]\)/);
          if (match) {
            currentModel.indexes.push(match[1].split(',').map(f => f.trim()));
          }
        }
        // Field
        else if (!line.startsWith('@@') && line.includes(' ')) {
          const field = this.parseField(line);
          if (field) {
            currentModel.fields.set(field.name, field);
            if (field.isRelation) {
              currentModel.relations.push(field);
            }
          }
        }
      }
      
      // Parse enum content
      if (inEnum && currentEnum && !line.includes('{') && !line.includes('}')) {
        if (line && !line.startsWith('@@')) {
          currentEnum.values.push(line);
        }
      }
    }
    
    return { models: this.models, enums: this.enums };
  }

  parseField(line) {
    // Remove comments
    const cleanLine = line.split('//')[0].trim();
    if (!cleanLine) return null;
    
    // Parse field definition
    const parts = cleanLine.split(/\s+/);
    if (parts.length < 2) return null;
    
    const field = {
      name: parts[0],
      type: parts[1],
      isOptional: parts[1].includes('?'),
      isArray: parts[1].includes('[]'),
      isRelation: false,
      isPrimaryKey: false,
      isUnique: false,
      hasDefault: false,
      columnName: null,
      attributes: []
    };
    
    // Clean type
    field.type = field.type.replace('?', '').replace('[]', '');
    
    // Check if it's a relation (capital letter = model reference)
    if (field.type[0] === field.type[0].toUpperCase() && !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Decimal', 'BigInt', 'Bytes'].includes(field.type)) {
      field.isRelation = true;
    }
    
    // Parse attributes
    const attributesStr = cleanLine.substring(cleanLine.indexOf(parts[1]) + parts[1].length).trim();
    
    // @id
    if (attributesStr.includes('@id')) field.isPrimaryKey = true;
    
    // @unique
    if (attributesStr.includes('@unique')) field.isUnique = true;
    
    // @default
    if (attributesStr.includes('@default')) field.hasDefault = true;
    
    // @map
    const mapMatch = attributesStr.match(/@map\("([^"]+)"\)/);
    if (mapMatch) field.columnName = mapMatch[1];
    
    // @db.
    const dbMatch = attributesStr.match(/@db\.(\w+)/);
    if (dbMatch) field.dbType = dbMatch[1];
    
    return field;
  }
}

// Database introspector
class DatabaseIntrospector {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async getTables() {
    const result = await this.prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    return result.map(r => r.table_name);
  }

  async getColumns(tableName) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = ${tableName}
      ORDER BY ordinal_position;
    `;
    return result;
  }

  async getIndexes(tableName) {
    const result = await this.prisma.$queryRaw`
      SELECT 
        i.indexname,
        i.indexdef,
        idx.indisprimary,
        idx.indisunique
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.tablename
      JOIN pg_index idx ON idx.indexrelid = (i.indexname)::regclass
      WHERE i.schemaname = 'public'
      AND i.tablename = ${tableName};
    `;
    return result;
  }

  async getFunctions() {
    const result = await this.prisma.$queryRaw`
      SELECT 
        routine_name,
        routine_type,
        specific_name,
        data_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `;
    return result;
  }

  async getEnums() {
    const result = await this.prisma.$queryRaw`
      SELECT 
        t.typname as enum_name,
        e.enumlabel as enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY t.typname, e.enumsortorder;
    `;
    
    // Group by enum name
    const enums = new Map();
    for (const row of result) {
      if (!enums.has(row.enum_name)) {
        enums.set(row.enum_name, []);
      }
      enums.get(row.enum_name).push(row.enum_value);
    }
    return enums;
  }
}

// Integrity checker
class IntegrityChecker {
  constructor(schemaData, dbIntrospector) {
    this.schemaData = schemaData;
    this.dbIntrospector = dbIntrospector;
    this.issues = [];
  }

  async check() {
    console.log(chalk.blue('\n🔍 Checking database integrity...\n'));
    
    // Get database state
    const dbTables = await this.dbIntrospector.getTables();
    const dbEnums = await this.dbIntrospector.getEnums();
    
    // Check tables
    await this.checkTables(dbTables);
    
    // Check enums
    await this.checkEnums(dbEnums);
    
    // Check for duplicate functions
    await this.checkFunctions();
    
    return this.issues;
  }

  async checkTables(dbTables) {
    const schemaModels = this.schemaData.models;
    
    // Check for extra tables in DB
    for (const dbTable of dbTables) {
      if (dbTable.startsWith('_')) continue; // Skip Prisma internal tables
      
      let found = false;
      for (const [modelName, model] of schemaModels) {
        const tableName = model.tableName || this.camelToSnake(modelName);
        if (tableName === dbTable) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        this.issues.push({
          type: 'EXTRA_TABLE',
          severity: 'warning',
          table: dbTable,
          message: `Table '${dbTable}' exists in database but not in schema`
        });
      }
    }
    
    // Check each model
    for (const [modelName, model] of schemaModels) {
      const tableName = model.tableName || this.camelToSnake(modelName);
      
      // Check if table exists
      if (!dbTables.includes(tableName)) {
        this.issues.push({
          type: 'MISSING_TABLE',
          severity: 'error',
          model: modelName,
          table: tableName,
          message: `Table '${tableName}' is defined in schema but missing in database`
        });
        continue;
      }
      
      // Check columns
      await this.checkColumns(modelName, model, tableName);
      
      // Check indexes
      await this.checkIndexes(modelName, model, tableName);
    }
  }

  async checkColumns(modelName, model, tableName) {
    const dbColumns = await this.dbIntrospector.getColumns(tableName);
    const dbColumnMap = new Map(dbColumns.map(col => [col.column_name, col]));
    
    // Check for extra columns in DB
    for (const dbCol of dbColumns) {
      let found = false;
      for (const [fieldName, field] of model.fields) {
        const columnName = field.columnName || this.camelToSnake(fieldName);
        if (columnName === dbCol.column_name || fieldName === dbCol.column_name) {
          found = true;
          break;
        }
      }
      
      if (!found && !dbCol.column_name.startsWith('_')) {
        this.issues.push({
          type: 'EXTRA_COLUMN',
          severity: 'warning',
          table: tableName,
          column: dbCol.column_name,
          message: `Column '${dbCol.column_name}' exists in table '${tableName}' but not in model '${modelName}'`
        });
      }
    }
    
    // Check each field
    for (const [fieldName, field] of model.fields) {
      if (field.isRelation) continue; // Skip relation fields
      
      const columnName = field.columnName || this.camelToSnake(fieldName);
      const dbCol = dbColumnMap.get(columnName) || dbColumnMap.get(fieldName);
      
      if (!dbCol) {
        this.issues.push({
          type: 'MISSING_COLUMN',
          severity: 'error',
          model: modelName,
          table: tableName,
          field: fieldName,
          column: columnName,
          message: `Column '${columnName}' is defined in model '${modelName}' but missing in table '${tableName}'`
        });
        continue;
      }
      
      // Check type compatibility
      this.checkTypeCompatibility(modelName, tableName, field, dbCol);
    }
  }

  checkTypeCompatibility(modelName, tableName, field, dbCol) {
    const typeMap = {
      'String': ['text', 'character varying', 'varchar', 'char'],
      'Int': ['integer', 'int', 'int4', 'smallint', 'int2'],
      'BigInt': ['bigint', 'int8'],
      'Float': ['double precision', 'float8', 'real', 'float4'],
      'Decimal': ['numeric', 'decimal'],
      'Boolean': ['boolean', 'bool'],
      'DateTime': ['timestamp without time zone', 'timestamp with time zone', 'timestamp'],
      'Json': ['json', 'jsonb'],
      'Bytes': ['bytea']
    };
    
    const expectedTypes = typeMap[field.type];
    if (!expectedTypes) return; // Custom type or enum
    
    const actualType = dbCol.data_type.toLowerCase();
    if (!expectedTypes.some(t => actualType.includes(t))) {
      this.issues.push({
        type: 'TYPE_MISMATCH',
        severity: 'error',
        model: modelName,
        table: tableName,
        field: field.name,
        column: dbCol.column_name,
        expected: field.type,
        actual: dbCol.data_type,
        message: `Type mismatch for '${field.name}' in '${modelName}': expected ${field.type} but found ${dbCol.data_type}`
      });
    }
    
    // Check nullability
    const isNullable = dbCol.is_nullable === 'YES';
    if (field.isOptional !== isNullable && !field.hasDefault && !field.isPrimaryKey) {
      this.issues.push({
        type: 'NULLABILITY_MISMATCH',
        severity: 'warning',
        model: modelName,
        table: tableName,
        field: field.name,
        column: dbCol.column_name,
        expected: field.isOptional ? 'nullable' : 'not null',
        actual: isNullable ? 'nullable' : 'not null',
        message: `Nullability mismatch for '${field.name}' in '${modelName}'`
      });
    }
  }

  async checkIndexes(modelName, model, tableName) {
    // Implementation would check indexes
    // Simplified for brevity
  }

  async checkEnums(dbEnums) {
    const schemaEnums = this.schemaData.enums;
    
    // Check for extra enums in DB
    for (const [enumName, values] of dbEnums) {
      if (!schemaEnums.has(enumName)) {
        this.issues.push({
          type: 'EXTRA_ENUM',
          severity: 'warning',
          enum: enumName,
          values: values,
          message: `Enum '${enumName}' exists in database but not in schema`
        });
      }
    }
    
    // Check schema enums
    for (const [enumName, enumDef] of schemaEnums) {
      const dbValues = dbEnums.get(enumName.toLowerCase());
      if (!dbValues) {
        this.issues.push({
          type: 'MISSING_ENUM',
          severity: 'error',
          enum: enumName,
          message: `Enum '${enumName}' is defined in schema but missing in database`
        });
        continue;
      }
      
      // Check values
      for (const value of enumDef.values) {
        if (!dbValues.includes(value)) {
          this.issues.push({
            type: 'MISSING_ENUM_VALUE',
            severity: 'error',
            enum: enumName,
            value: value,
            message: `Enum value '${value}' is defined in '${enumName}' but missing in database`
          });
        }
      }
    }
  }

  async checkFunctions() {
    const functions = await this.dbIntrospector.getFunctions();
    const functionCount = new Map();
    
    for (const func of functions) {
      const key = func.routine_name;
      functionCount.set(key, (functionCount.get(key) || 0) + 1);
    }
    
    for (const [name, count] of functionCount) {
      if (count > 1) {
        this.issues.push({
          type: 'DUPLICATE_FUNCTION',
          severity: 'warning',
          function: name,
          count: count,
          message: `Function '${name}' has ${count} duplicates`
        });
      }
    }
  }

  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
  }
}

// Migration generator
class MigrationGenerator {
  constructor(issues) {
    this.issues = issues;
  }

  generate() {
    const migrations = {
      tables: [],
      columns: [],
      types: [],
      enums: [],
      cleanup: []
    };
    
    for (const issue of this.issues) {
      switch (issue.type) {
        case 'MISSING_TABLE':
          migrations.tables.push(this.generateCreateTable(issue));
          break;
        case 'EXTRA_TABLE':
          migrations.cleanup.push(`-- DROP TABLE IF EXISTS "${issue.table}";`);
          break;
        case 'MISSING_COLUMN':
          migrations.columns.push(this.generateAddColumn(issue));
          break;
        case 'EXTRA_COLUMN':
          migrations.cleanup.push(`-- ALTER TABLE "${issue.table}" DROP COLUMN IF EXISTS "${issue.column}";`);
          break;
        case 'TYPE_MISMATCH':
          migrations.types.push(this.generateAlterType(issue));
          break;
        case 'MISSING_ENUM':
          migrations.enums.push(this.generateCreateEnum(issue));
          break;
        case 'MISSING_ENUM_VALUE':
          migrations.enums.push(`ALTER TYPE "${issue.enum}" ADD VALUE '${issue.value}';`);
          break;
      }
    }
    
    return migrations;
  }

  generateCreateTable(issue) {
    // Simplified - would need full model definition
    return `-- CREATE TABLE "${issue.table}" (...);`;
  }

  generateAddColumn(issue) {
    const type = this.mapPrismaTypeToSQL(issue.field);
    return `ALTER TABLE "${issue.table}" ADD COLUMN "${issue.column}" ${type};`;
  }

  generateAlterType(issue) {
    const type = this.mapPrismaTypeToSQL({ type: issue.expected });
    return `ALTER TABLE "${issue.table}" ALTER COLUMN "${issue.column}" TYPE ${type};`;
  }

  generateCreateEnum(issue) {
    return `-- CREATE TYPE "${issue.enum}" AS ENUM (...);`;
  }

  mapPrismaTypeToSQL(field) {
    const typeMap = {
      'String': 'TEXT',
      'Int': 'INTEGER',
      'BigInt': 'BIGINT',
      'Float': 'DOUBLE PRECISION',
      'Boolean': 'BOOLEAN',
      'DateTime': 'TIMESTAMP',
      'Json': 'JSONB'
    };
    return typeMap[field.type] || 'TEXT';
  }
}

// Module checker
class ModuleChecker {
  constructor() {
    this.apiDir = path.join(process.cwd(), 'app', 'api');
    this.libDir = path.join(process.cwd(), 'lib');
  }

  async checkDuplicateFunctions() {
    const functions = new Map();
    const issues = [];
    
    // Scan directories
    await this.scanDirectory(this.apiDir, functions);
    await this.scanDirectory(this.libDir, functions);
    
    // Find duplicates
    for (const [name, locations] of functions) {
      if (locations.length > 1) {
        issues.push({
          type: 'DUPLICATE_FUNCTION',
          name: name,
          locations: locations,
          message: `Function '${name}' is defined in ${locations.length} places`
        });
      }
    }
    
    return issues;
  }

  async scanDirectory(dir, functions) {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        
        if (file.isDirectory()) {
          await this.scanDirectory(fullPath, functions);
        } else if (file.name.endsWith('.js') || file.name.endsWith('.ts')) {
          await this.scanFile(fullPath, functions);
        }
      }
    } catch (error) {
      // Directory might not exist
    }
  }

  async scanFile(filePath, functions) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Find function declarations
      const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
      
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        const functionName = match[1] || match[2];
        if (!functions.has(functionName)) {
          functions.set(functionName, []);
        }
        functions.get(functionName).push(filePath);
      }
    } catch (error) {
      // File read error
    }
  }
}

// Main menu
class IntegrityManager {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async run() {
    console.log(chalk.bold.blue('\n🔧 Database Integrity Manager\n'));
    
    while (true) {
      const choice = await this.showMenu();
      
      switch (choice) {
        case '1':
          await this.fullIntegrityCheck();
          break;
        case '2':
          await this.generateMigrations();
          break;
        case '3':
          await this.checkModuleDuplicates();
          break;
        case '4':
          await this.applyFixes();
          break;
        case '5':
          await this.backupDatabase();
          break;
        case '6':
          await this.showSchemaInfo();
          break;
        case '0':
          console.log(chalk.green('\n👋 Goodbye!\n'));
          this.rl.close();
          await prisma.$disconnect();
          process.exit(0);
        default:
          console.log(chalk.red('Invalid choice. Please try again.'));
      }
    }
  }

  async showMenu() {
    console.log(chalk.cyan('\n📋 Main Menu:'));
    console.log('1. Full Integrity Check');
    console.log('2. Generate Migrations');
    console.log('3. Check Module Duplicates');
    console.log('4. Apply Fixes (with preview)');
    console.log('5. Backup Database');
    console.log('6. Show Schema Info');
    console.log('0. Exit');
    
    return new Promise(resolve => {
      this.rl.question('\nEnter your choice: ', resolve);
    });
  }

  async fullIntegrityCheck() {
    try {
      // Parse schema
      const parser = new PrismaSchemaParser(path.join(process.cwd(), 'prisma', 'schema.prisma'));
      const schemaData = await parser.parse();
      
      console.log(chalk.blue(`\n📊 Found ${schemaData.models.size} models and ${schemaData.enums.size} enums in schema\n`));
      
      // Check integrity
      const introspector = new DatabaseIntrospector(prisma);
      const checker = new IntegrityChecker(schemaData, introspector);
      const issues = await checker.check();
      
      // Display results
      if (issues.length === 0) {
        console.log(chalk.green('\n✅ No integrity issues found!\n'));
      } else {
        console.log(chalk.yellow(`\n⚠️  Found ${issues.length} issues:\n`));
        
        // Group by severity
        const errors = issues.filter(i => i.severity === 'error');
        const warnings = issues.filter(i => i.severity === 'warning');
        
        if (errors.length > 0) {
          console.log(chalk.red(`\n❌ Errors (${errors.length}):`));
          errors.forEach(issue => {
            console.log(chalk.red(`  - ${issue.message}`));
          });
        }
        
        if (warnings.length > 0) {
          console.log(chalk.yellow(`\n⚠️  Warnings (${warnings.length}):`));
          warnings.forEach(issue => {
            console.log(chalk.yellow(`  - ${issue.message}`));
          });
        }
      }
      
      // Save report
      const report = {
        timestamp: new Date().toISOString(),
        issues: issues,
        summary: {
          total: issues.length,
          errors: issues.filter(i => i.severity === 'error').length,
          warnings: issues.filter(i => i.severity === 'warning').length
        }
      };
      
      await fs.writeFile(
        path.join(process.cwd(), 'db-integrity-report.json'),
        JSON.stringify(report, null, 2)
      );
      
      console.log(chalk.gray('\n📄 Full report saved to db-integrity-report.json'));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error during integrity check:'), error.message);
    }
  }

  async generateMigrations() {
    try {
      // Load last report
      const reportPath = path.join(process.cwd(), 'db-integrity-report.json');
      const report = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      
      if (report.issues.length === 0) {
        console.log(chalk.green('\n✅ No issues to generate migrations for.\n'));
        return;
      }
      
      const generator = new MigrationGenerator(report.issues);
      const migrations = generator.generate();
      
      // Generate SQL file
      let sql = '-- Database Integrity Fixes\n';
      sql += `-- Generated: ${new Date().toISOString()}\n\n`;
      
      if (migrations.tables.length > 0) {
        sql += '-- Missing Tables\n';
        sql += migrations.tables.join('\n') + '\n\n';
      }
      
      if (migrations.columns.length > 0) {
        sql += '-- Missing Columns\n';
        sql += migrations.columns.join('\n') + '\n\n';
      }
      
      if (migrations.types.length > 0) {
        sql += '-- Type Fixes\n';
        sql += migrations.types.join('\n') + '\n\n';
      }
      
      if (migrations.enums.length > 0) {
        sql += '-- Enum Fixes\n';
        sql += migrations.enums.join('\n') + '\n\n';
      }
      
      if (migrations.cleanup.length > 0) {
        sql += '-- Cleanup (uncomment to execute)\n';
        sql += migrations.cleanup.join('\n') + '\n';
      }
      
      const migrationFile = `fix-integrity-${Date.now()}.sql`;
      await fs.writeFile(path.join(process.cwd(), migrationFile), sql);
      
      console.log(chalk.green(`\n✅ Migration file generated: ${migrationFile}\n`));
      console.log(chalk.yellow('Review the file before applying!'));
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error generating migrations:'), error.message);
    }
  }

  async checkModuleDuplicates() {
    try {
      const checker = new ModuleChecker();
      const duplicates = await checker.checkDuplicateFunctions();
      
      if (duplicates.length === 0) {
        console.log(chalk.green('\n✅ No duplicate functions found!\n'));
      } else {
        console.log(chalk.yellow(`\n⚠️  Found ${duplicates.length} duplicate functions:\n`));
        
        for (const dup of duplicates) {
          console.log(chalk.yellow(`\n${dup.name}:`));
          dup.locations.forEach(loc => {
            const relPath = path.relative(process.cwd(), loc);
            console.log(chalk.gray(`  - ${relPath}`));
          });
        }
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error checking duplicates:'), error.message);
    }
  }

  async applyFixes() {
    console.log(chalk.yellow('\n⚠️  This feature requires manual review of generated migrations.'));
    console.log(chalk.yellow('Please use: npx prisma migrate dev --name fix-integrity'));
  }

  async backupDatabase() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `backup-${timestamp}.sql`;
      
      console.log(chalk.blue('\n🔄 Creating database backup...'));
      
      // Get database URL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found in environment');
      }
      
      // Parse connection string
      const url = new URL(dbUrl);
      const dbName = url.pathname.slice(1);
      
      // Create backup using pg_dump
      const pgDump = spawn('pg_dump', [
        '-h', url.hostname,
        '-p', url.port || '5432',
        '-U', url.username,
        '-d', dbName,
        '-f', backupFile,
        '--no-owner',
        '--no-privileges'
      ], {
        env: { ...process.env, PGPASSWORD: url.password }
      });
      
      pgDump.on('close', (code) => {
        if (code === 0) {
          console.log(chalk.green(`\n✅ Backup created: ${backupFile}\n`));
        } else {
          console.log(chalk.red('\n❌ Backup failed. Make sure pg_dump is installed.\n'));
        }
      });
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error creating backup:'), error.message);
    }
  }

  async showSchemaInfo() {
    try {
      const parser = new PrismaSchemaParser(path.join(process.cwd(), 'prisma', 'schema.prisma'));
      const schemaData = await parser.parse();
      
      console.log(chalk.blue('\n📊 Schema Information:\n'));
      
      console.log(chalk.cyan(`Models (${schemaData.models.size}):`));
      for (const [name, model] of schemaData.models) {
        const tableName = model.tableName || parser.camelToSnake(name);
        console.log(`  - ${name} → ${tableName} (${model.fields.size} fields)`);
      }
      
      console.log(chalk.cyan(`\nEnums (${schemaData.enums.size}):`));
      for (const [name, enumDef] of schemaData.enums) {
        console.log(`  - ${name} (${enumDef.values.length} values)`);
      }
      
      // Get database stats
      const introspector = new DatabaseIntrospector(prisma);
      const tables = await introspector.getTables();
      const functions = await introspector.getFunctions();
      
      console.log(chalk.cyan('\nDatabase Stats:'));
      console.log(`  - Tables: ${tables.length}`);
      console.log(`  - Functions: ${functions.length}`);
      
    } catch (error) {
      console.error(chalk.red('\n❌ Error showing schema info:'), error.message);
    }
  }
}

// Run the manager
const manager = new IntegrityManager();
manager.run().catch(console.error);