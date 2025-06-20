#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
const lines = schemaContent.split('\n');

// Get table name mappings from schema
const modelToTable = new Map();
let currentModel = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  
  if (line.startsWith('model ')) {
    currentModel = line.match(/model\s+(\w+)/)[1];
    // Default table name is snake_case
    const defaultTable = currentModel.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    modelToTable.set(currentModel, defaultTable);
    console.log(`Found model: ${currentModel} → ${defaultTable}`);
  }
  
  if (currentModel && line.includes('@@map(')) {
    const match = line.match(/@@map\("([^"]+)"\)/);
    if (match) {
      console.log(`  Overriding ${currentModel} → ${match[1]}`);
      modelToTable.set(currentModel, match[1]);
    }
  }
}

console.log('\nFinal mappings:');
for (const [model, table] of modelToTable) {
  console.log(`${model} → ${table}`);
}

console.log('\nLooking for viral_posts:');
const hasViralPosts = Array.from(modelToTable.values()).includes('viral_posts');
console.log(`viral_posts in mappings: ${hasViralPosts}`);

// Check for string and rt_status
console.log('\nLooking for problematic entries:');
for (const [model, table] of modelToTable) {
  if (table === 'string' || table === 'rt_status') {
    console.log(`WARNING: ${model} maps to ${table}`);
  }
}