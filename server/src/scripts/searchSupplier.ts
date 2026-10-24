import fs from 'fs';
import path from 'path';

function searchInDir(dir: string, pattern: string) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      searchInDir(full, pattern);
    } else if (stat.isFile() && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js'))) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        console.log(`[${pattern}] in: ${full}`);
      }
    }
  }
}

console.log('Searching for "supplier":');
searchInDir('e:/Techtrix/client/src', 'supplier');
searchInDir('e:/Techtrix/server/src', 'supplier');
