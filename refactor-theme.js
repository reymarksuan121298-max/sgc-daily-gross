import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src', 'components');

const replacements = [
  { search: /text-slate-200/g, replace: 'text-textPrimary' },
  { search: /bg-slate-800\/50/g, replace: 'bg-surface-header/50' },
  { search: /bg-slate-800\/80/g, replace: 'bg-surface-header/80' },
  { search: /bg-slate-800\/40/g, replace: 'bg-surface-header/40' },
  { search: /bg-slate-800\/30/g, replace: 'bg-surface-header/30' },
  { search: /bg-slate-800\/20/g, replace: 'bg-surface-header/20' },
  { search: /bg-slate-800/g, replace: 'bg-surface-header' },
  { search: /divide-slate-800\/50/g, replace: 'divide-border-divider/50' },
  { search: /divide-slate-800\/40/g, replace: 'divide-border-divider/40' },
  { search: /text-slate-900/g, replace: 'text-textPrimary' },
  { search: /bg-slate-700\/50/g, replace: 'bg-surface-hover' },
  { search: /hover:bg-slate-700/g, replace: 'hover:bg-surface-hover' },
  { search: /hover:bg-slate-600\/50/g, replace: 'hover:bg-surface-hover' },
  { search: /border-slate-600\/50/g, replace: 'border-border-divider' },
  { search: /hover:border-slate-600/g, replace: 'hover:border-border-divider' },
  { search: /bg-slate-200/g, replace: 'bg-surface-hover' }
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  for (const { search, replace } of replacements) {
    content = content.replace(search, replace);
  }

  // specifically revert bg-white hover:bg-slate-200 replacements that broke download button
  // hover:bg-slate-200 -> hover:bg-surface-hover (done above)
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${path.basename(filePath)}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

walkDir(componentsDir);
console.log('Refactoring pass 2 complete.');
