import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = process.cwd();

const TARGET_FILES = ['README.md', 'SECURITY.md', 'CHANGELOG.md'];

function collectMarkdownFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectMarkdownFiles(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const files = [
  ...TARGET_FILES.map((f) => join(ROOT, f)),
  ...collectMarkdownFiles(join(ROOT, '.opencode', 'plans')),
];

const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;
let failed = false;

for (const file of files) {
  if (!existsSync(file)) {
    console.error(`Missing file: ${file}`);
    failed = true;
    continue;
  }
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(linkRegex)) {
    const raw = match[1].trim();
    if (/^[a-z]+:/i.test(raw) || raw.startsWith('#')) continue;
    const [pathPart] = raw.split('#');
    if (!pathPart) continue;
    const target = resolve(dirname(file), pathPart);
    if (!existsSync(target)) {
      console.error(`Broken link in ${file}: ${raw}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('All links OK');
