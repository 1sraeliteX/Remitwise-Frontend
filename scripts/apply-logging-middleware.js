#!/usr/bin/env node

/**
 * Script to apply API logging middleware to all route files
 * This script automatically wraps existing HTTP method handlers with the withApiLogging wrapper
 */

const fs = require('fs');
const path = require('path');

// Find all route.ts files in the API directory
function findRouteFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findRouteFiles(fullPath, files);
    } else if (item === 'route.ts') {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Apply logging middleware to a single file
function applyLoggingToRoute(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has logging import
  if (content.includes('withApiLogging')) {
    console.log(`  ✓ Already has logging middleware`);
    return;
  }
  
  // Add import statement after existing imports
  const importRegex = /(^import[^;]+;\s*\n)+/m;
  const importMatch = content.match(importRegex);
  
  if (importMatch) {
    const lastImport = importMatch[0];
    const newImport = lastImport + "import { withApiLogging } from '@/lib/api-logging';\n";
    content = content.replace(lastImport, newImport);
  } else {
    // If no imports found, add at the top
    content = "import { withApiLogging } from '@/lib/api-logging';\n\n" + content;
  }
  
  // Wrap HTTP method handlers
  const methodRegex = /export\s+(async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/g;
  let modified = false;
  
  content = content.replace(methodRegex, (match, asyncKeyword, method) => {
    modified = true;
    return `export const ${method} = withApiLogging(${asyncKeyword || ''}async `;
  });
  
  // Also handle arrow function exports
  const arrowRegex = /export\s+(const|let)\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*(async\s+)?\(/g;
  content = content.replace(arrowRegex, (match, decl, method, asyncKeyword) => {
    modified = true;
    return `export const ${method} = withApiLogging(${asyncKeyword || ''} `;
  });
  
  if (modified) {
    // Add closing parenthesis to the end of function declarations
    content = content.replace(
      /(export\s+const\s+(GET|POST|PUT|DELETE|PATCH)\s*=\s*withApiLogging\([^)]*\)\s*=>\s*{[^}]*})\s*;?/g,
      '$1);'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`  ✓ Applied logging middleware`);
  } else {
    console.log(`  ⚠ No HTTP method handlers found`);
  }
}

// Main execution
const apiDir = path.join(__dirname, '..', 'app', 'api');
const routeFiles = findRouteFiles(apiDir);

console.log(`Found ${routeFiles.length} API route files\n`);

for (const file of routeFiles) {
  applyLoggingToRoute(file);
}

console.log('\n✅ API logging middleware application complete!');
