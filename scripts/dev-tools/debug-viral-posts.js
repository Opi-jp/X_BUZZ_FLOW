#!/usr/bin/env node

const { PrismaClient } = require('../../lib/generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debug() {
  try {
    // Check if viral_posts exists in DB
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'viral_posts';
    `;
    
    console.log('viral_posts in DB:', tables.length > 0 ? 'YES' : 'NO');
    
    // Check schema
    const schemaContent = fs.readFileSync(path.join(process.cwd(), 'prisma', 'schema.prisma'), 'utf-8');
    const hasModel = schemaContent.includes('model viral_posts');
    console.log('viral_posts model in schema:', hasModel ? 'YES' : 'NO');
    
    // Check the exact model definition
    if (hasModel) {
      const lines = schemaContent.split('\n');
      const modelLine = lines.findIndex(l => l.includes('model viral_posts'));
      console.log('\nModel definition at line', modelLine + 1);
      
      // Check for @@map
      for (let i = modelLine; i < lines.length && i < modelLine + 50; i++) {
        if (lines[i].includes('@@map(')) {
          console.log('Has @@map:', lines[i].trim());
          break;
        }
        if (lines[i].trim() === '}') break;
      }
    }
    
    // Check if the model name transforms to viral_posts
    const modelName = 'viral_posts';
    const snakeCase = modelName.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    console.log('\nModel name:', modelName);
    console.log('Snake case:', snakeCase);
    console.log('Match:', modelName === snakeCase ? 'YES' : 'NO');
    
  } finally {
    await prisma.$disconnect();
  }
}

debug();