#!/usr/bin/env node

const { PrismaClient } = require('../../lib/generated/prisma');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

const prisma = new PrismaClient();

async function checkIntegrity() {
  console.log(chalk.blue('\n🔍 Checking Database Integrity...\n'));
  
  try {
    // Get all tables from database
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    // Get all custom types/enums from database
    const types = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname;
    `;
    
    console.log(chalk.blue(`Found ${types.length} custom types/enums in database`));
    
    console.log(chalk.blue(`Found ${tables.length} tables in database\n`));
    
    // Read schema.prisma to get models
    const schemaContent = await fs.readFile(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
    const modelMatches = schemaContent.match(/^model\s+(\w+)\s*\{/gm) || [];
    const models = modelMatches.map(match => match.match(/model\s+(\w+)/)[1]);
    
    console.log(chalk.blue(`Found ${models.length} models in schema\n`));
    
    // Get table name mappings from schema
    const modelToTable = new Map();
    const lines = schemaContent.split('\n');
    let currentModel = null;
    let inModel = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('model ')) {
        currentModel = line.match(/model\s+(\w+)/)[1];
        inModel = true;
        // Default table name is snake_case
        const defaultTable = currentModel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
        modelToTable.set(currentModel, defaultTable);
      }
      
      if (inModel && currentModel && line.includes('@@map(')) {
        const match = line.match(/@@map\("([^"]+)"\)/);
        if (match) {
          modelToTable.set(currentModel, match[1]);
        }
      }
      
      // End of model
      if (inModel && line === '}') {
        currentModel = null;
        inModel = false;
      }
    }
    
    // Compare
    const dbTableNames = tables.map(t => t.table_name);
    const schemaTableNames = Array.from(modelToTable.values());
    
    // Debug: Show all schema table names
    console.log(chalk.gray('Schema table names:', schemaTableNames.join(', '), '\n'));
    
    // Find mismatches
    const extraInDb = dbTableNames.filter(t => 
      !t.startsWith('_') && !schemaTableNames.includes(t)
    );
    
    // Filter out type names from the missing tables check
    const typeNames = types.map(t => t.typname);
    const missingInDb = schemaTableNames.filter(t => 
      !dbTableNames.includes(t) && !typeNames.includes(t)
    );
    
    // Debug viral_posts
    console.log(chalk.gray(`viral_posts in schema tables: ${schemaTableNames.includes('viral_posts')}`));
    console.log(chalk.gray(`viral_posts in db tables: ${dbTableNames.includes('viral_posts')}\n`));
    
    if (extraInDb.length > 0) {
      console.log(chalk.yellow('⚠️  Extra tables in database (not in schema):'));
      extraInDb.forEach(t => console.log(chalk.yellow(`  - ${t}`)));
    }
    
    if (missingInDb.length > 0) {
      console.log(chalk.red('\n❌ Missing tables in database (in schema):'));
      missingInDb.forEach(t => console.log(chalk.red(`  - ${t}`)));
    }
    
    // Check specific problem table
    if (dbTableNames.includes('api_tasks')) {
      console.log(chalk.cyan('\n📊 Checking api_tasks table...'));
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'api_tasks'
        ORDER BY ordinal_position;
      `;
      
      console.log(chalk.cyan('Columns in api_tasks:'));
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });
      
      // Check if ApiTask model exists in schema
      const hasApiTaskModel = models.includes('ApiTask');
      if (!hasApiTaskModel) {
        console.log(chalk.red('\n❌ ApiTask model is missing from schema!'));
        console.log(chalk.yellow('This is why you get "api_tasks.task_type does not exist" errors'));
      }
    }
    
    // Summary
    console.log(chalk.blue('\n📊 Summary:'));
    console.log(`  - Total tables in DB: ${tables.length}`);
    console.log(`  - Total models in schema: ${models.length}`);
    console.log(`  - Extra tables in DB: ${extraInDb.length}`);
    console.log(`  - Missing tables in DB: ${missingInDb.length}`);
    
    if (extraInDb.length > 0 || missingInDb.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendation:'));
      console.log('  1. Run "npx prisma db pull" to sync schema with database');
      console.log('  2. Review the changes and commit if appropriate');
      console.log('  3. Run "npx prisma generate" to update the client');
    } else {
      console.log(chalk.green('\n✅ Database and schema are in sync!'));
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error:'), error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkIntegrity();