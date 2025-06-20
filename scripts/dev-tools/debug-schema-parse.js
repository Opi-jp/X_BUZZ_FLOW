#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');

// Find all model definitions
const lines = schemaContent.split('\n');
const models = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/^model\s+(\w+)\s*\{/)) {
    const match = line.match(/^model\s+(\w+)/);
    if (match) {
      models.push({ name: match[1], line: i + 1 });
    }
  }
}

console.log(`Found ${models.length} models:`);
models.forEach(m => console.log(`  - ${m.name} (line ${m.line})`));

// Check for problematic models
const suspicious = models.filter(m => 
  m.name === 'string' || 
  m.name === 'rt_status' ||
  m.name.toLowerCase() === 'string'
);

if (suspicious.length > 0) {
  console.log('\nSuspicious models found:');
  suspicious.forEach(m => {
    console.log(`\n${m.name} at line ${m.line}:`);
    // Show context
    for (let j = Math.max(0, m.line - 3); j < Math.min(lines.length, m.line + 3); j++) {
      console.log(`${j + 1}: ${lines[j]}`);
    }
  });
}