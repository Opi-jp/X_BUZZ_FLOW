#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
const lines = schemaContent.split('\n');

const models = [];
let currentModel = null;
let inModel = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // Start of model
  if (line.match(/^model\s+(\w+)\s*\{/)) {
    const match = line.match(/^model\s+(\w+)/);
    if (match) {
      currentModel = {
        name: match[1],
        line: i + 1,
        tableName: null
      };
      inModel = true;
    }
  }
  
  // Look for @@map inside model
  if (inModel && trimmed.includes('@@map(')) {
    const mapMatch = trimmed.match(/@@map\("([^"]+)"\)/);
    if (mapMatch && currentModel) {
      currentModel.tableName = mapMatch[1];
    }
  }
  
  // End of model
  if (inModel && line.match(/^\}/)) {
    if (currentModel) {
      // If no explicit mapping, use snake_case of model name
      if (!currentModel.tableName) {
        currentModel.tableName = currentModel.name
          .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
          .replace(/^_/, '');
      }
      models.push(currentModel);
      currentModel = null;
      inModel = false;
    }
  }
}

console.log('Model to Table mappings:');
console.log('========================');
models.forEach(m => {
  console.log(`${m.name} → ${m.tableName}`);
});

// Find models that might map to 'string' or 'rt_status'
console.log('\nLooking for mappings to "string" or "rt_status":');
const targetTables = ['string', 'rt_status'];
targetTables.forEach(target => {
  const found = models.find(m => m.tableName === target);
  if (found) {
    console.log(`  ${target}: mapped from model ${found.name}`);
  } else {
    console.log(`  ${target}: NO MODEL FOUND`);
  }
});