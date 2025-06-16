#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Updating "expertise" to "theme" in critical files...\n');

// Critical files that need to be updated
const criticalFiles = [
  // API routes
  'app/api/viral/cot-session/[sessionId]/process/route.ts',
  'app/api/viral/cot-session/[sessionId]/progress/route.ts',
  'app/api/viral/cot-session/[sessionId]/async-status/route.ts',
  'app/api/viral/cot-draft/[draftId]/route.ts',
  'app/api/viral/cot-draft/route.ts',
  'app/api/viral/cot-session/[sessionId]/route.ts',
  'app/api/viral/cron/route.ts',
  
  // Frontend components
  'app/viral/cot/drafts/page.tsx',
  'app/viral/cot/drafts/[draftId]/page.tsx',
  'app/viral/page.tsx',
  'app/viral/cot-step/page.tsx',
  
  // Library files
  'lib/perplexity.ts',
  'lib/perplexity-analyzer.ts',
  'lib/search-categories.ts',
  'lib/cot-session-manager.ts',
  
  // Worker
  'scripts/async-worker-v2.js'
];

const projectRoot = '/Users/yukio/X_BUZZ_FLOW';

// Backup original files
console.log('📁 Creating backups...');
const backupDir = path.join(projectRoot, 'backup-expertise-to-theme');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

let updatedFiles = 0;
let totalReplacements = 0;

criticalFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  
  // Skip if no expertise found
  if (!content.includes('expertise')) {
    console.log(`✅ No changes needed: ${file}`);
    return;
  }
  
  // Create backup
  const backupPath = path.join(backupDir, file.replace(/\//g, '_'));
  fs.writeFileSync(backupPath, content);
  
  // Replace expertise with theme
  let updatedContent = content;
  let replacements = 0;
  
  // Replace different patterns
  const patterns = [
    // Direct property access
    { pattern: /\.expertise/g, replacement: '.theme' },
    // Variable declarations
    { pattern: /\bexpertise:/g, replacement: 'theme:' },
    // Function parameters
    { pattern: /\bexpertise\s*:/g, replacement: 'theme:' },
    // Template literals
    { pattern: /\$\{expertise\}/g, replacement: '${theme}' },
    { pattern: /\$\{config\.expertise/g, replacement: '${config.theme' },
    { pattern: /\$\{session\.expertise/g, replacement: '${session.theme' },
    { pattern: /\$\{context\.expertise/g, replacement: '${context.theme' },
    // Object destructuring
    { pattern: /\{ expertise\s*\}/g, replacement: '{ theme }' },
    { pattern: /\{ expertise,/g, replacement: '{ theme,' },
    { pattern: /, expertise\s*\}/g, replacement: ', theme }' },
    { pattern: /, expertise,/g, replacement: ', theme,' },
    // Comments and strings (skip these)
    // We'll handle these separately
  ];
  
  patterns.forEach(({ pattern, replacement }) => {
    const matches = updatedContent.match(pattern);
    if (matches) {
      replacements += matches.length;
      updatedContent = updatedContent.replace(pattern, replacement);
    }
  });
  
  // Special handling for function parameters and types
  updatedContent = updatedContent.replace(/\bexpertise\s*:\s*string/g, 'theme: string');
  updatedContent = updatedContent.replace(/\bexpertise\s*\?:\s*string/g, 'theme?: string');
  
  // Don't replace in comments or certain strings
  const lines = updatedContent.split('\n');
  const finalLines = lines.map(line => {
    // Skip if it's a comment
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return line;
    }
    
    // Skip if it's in a string that's clearly a message
    if (line.includes('"expertise"') && (line.includes('Error') || line.includes('missing'))) {
      return line;
    }
    
    return line;
  });
  
  updatedContent = finalLines.join('\n');
  
  if (replacements > 0) {
    fs.writeFileSync(fullPath, updatedContent);
    console.log(`📝 Updated ${file}: ${replacements} replacements`);
    updatedFiles++;
    totalReplacements += replacements;
  } else {
    console.log(`✅ No changes made: ${file}`);
  }
});

console.log('\n📊 Summary:');
console.log(`- Files updated: ${updatedFiles}`);
console.log(`- Total replacements: ${totalReplacements}`);
console.log(`- Backups saved in: ${backupDir}`);
console.log('\n⚠️  Please review the changes and test the application!');
console.log('💡 Run "npm run type-check" to verify TypeScript compilation');