import fs from 'fs';
import path from 'path';

function searchInDir(dir: string, patterns: string[]) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory() && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      searchInDir(full, patterns);
    } else if (stat.isFile() && (f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.json'))) {
      const content = fs.readFileSync(full, 'utf8');
      for (const p of patterns) {
        if (content.toLowerCase().includes(p.toLowerCase())) {
          console.log(`[${p}] in ${full}`);
        }
      }
    }
  }
}

console.log('Searching client:');
searchInDir('e:/Techtrix/client/src', ['demo credentials', 'one-click', 'demouser', 'quick login', 'isdemo', 'provider@foodbridge.org', 'ngo@hopekitchen.org', 'admin@foodbridge.org']);

console.log('Searching server:');
searchInDir('e:/Techtrix/server/src', ['demo credentials', 'one-click', 'demouser', 'isdemo', 'provider@foodbridge.org', 'ngo@hopekitchen.org', 'seedservice']);
