#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Finding all occurrences of "expertise" in the codebase...\n');

// Directories to exclude
const excludeDirs = [
  'node_modules',
  '.next',
  '.git',
  'lib/generated',
  'test-scripts',
  'prisma/migrations'
];

// File extensions to include
const includeExts = ['.ts', '.tsx', '.js', '.jsx'];

function findFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip excluded directories
    if (entry.isDirectory() && excludeDirs.some(exclude => fullPath.includes(exclude))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      findFiles(fullPath, files);
    } else if (includeExts.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

const projectRoot = '/Users/yukio/X_BUZZ_FLOW';
const files = findFiles(projectRoot);

console.log(`📁 Checking ${files.length} files...\n`);

const results = [];

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('expertise')) {
        results.push({
          file: file.replace(projectRoot + '/', ''),
          line: index + 1,
          content: line.trim()
        });
      }
    });
  } catch (error) {
    // Skip files that can't be read
  }
}

if (results.length === 0) {
  console.log('✅ No occurrences of "expertise" found!');
} else {
  console.log(`⚠️  Found ${results.length} occurrences of "expertise":\n`);
  
  // Group by file
  const byFile = {};
  results.forEach(result => {
    if (!byFile[result.file]) {
      byFile[result.file] = [];
    }
    byFile[result.file].push(result);
  });
  
  // Display results
  Object.entries(byFile).forEach(([file, occurrences]) => {
    console.log(`\n📄 ${file}:`);
    occurrences.forEach(occ => {
      console.log(`   Line ${occ.line}: ${occ.content}`);
    });
  });
  
  console.log('\n\n📝 Summary:');
  console.log(`- Total files with "expertise": ${Object.keys(byFile).length}`);
  console.log(`- Total occurrences: ${results.length}`);
  console.log('\n💡 These should be changed to "theme" to match the database schema.');
}