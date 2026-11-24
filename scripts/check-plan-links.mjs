import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = process.cwd();
const filesToScan = ['roadmap.md', '.opencode/plans/INDEX.md'];
function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md')) out.push(p);
  }
  return out;
}
for (const p of walk('.opencode/plans')) {
  if (!filesToScan.includes(p)) filesToScan.push(p);
}

const linkRe = /\[[^\]]*\]\(([^)]+)\)/g;
let broken = [];
for (const rel of filesToScan) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) { broken.push(`missing file: ${rel}`); continue; }
  const text = readFileSync(abs, 'utf8');
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    const target = m[1].trim();
    if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('mailto:') || target.startsWith('#')) continue;
    const [pathPart] = target.split('#');
    if (!pathPart) continue;
    const resolved = resolve(dirname(abs), pathPart);
    if (!existsSync(resolved)) broken.push(`${rel} -> ${target}`);
  }
}

// §4 ID uniqueness
const roadmap = readFileSync(resolve(ROOT, 'roadmap.md'), 'utf8');
const sectionMatch = roadmap.match(/## 4\. Canonical Task Backlog([\s\S]*?)## 5\./);
const section = sectionMatch ? sectionMatch[1] : '';
const ids = [...section.matchAll(/`P\d{1,2}-\d{2}`/g)].map((m) => m[0].replace(/`/g, ''));
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
const unique = new Set(ids);

const expected = [
 'P0-01','P0-02',
 'P01-01','P01-02','P01-03','P01-04','P01-05','P01-06','P01-07','P01-08','P01-09','P01-10',
 'P02-01','P02-02','P02-03','P02-04','P02-05','P02-06',
 'P03-01','P03-02','P03-03','P03-04','P03-05','P03-06','P03-07','P03-08','P03-09','P03-10','P03-11','P03-12','P03-13',
 'P04-01','P04-02','P04-03','P04-04','P04-05','P04-06',
 'P05-01','P05-02','P05-03','P05-04','P05-05','P05-06','P05-07','P05-08','P05-09',
 'P06-01','P06-02','P06-03','P06-04','P06-05','P06-06','P06-07',
 'P07-01','P07-02','P07-03','P07-04','P07-05','P07-06',
 'P08-01','P08-02','P08-03','P08-04','P08-05','P08-06','P08-07','P08-08','P08-09','P08-10','P08-11',
 'P09-01','P09-02','P09-03','P09-04','P09-05','P09-06','P09-07','P09-08','P09-09','P09-10',
 'P10-01','P10-02','P10-03',
];
const missingIds = expected.filter((id) => !unique.has(id));
const extraIds = [...unique].filter((id) => !expected.includes(id));

// §6 phases have at least one step plan
const phaseMatch = roadmap.match(/## 6\. Phase Plan([\s\S]*?)### 6\.1/);
const phaseSection = phaseMatch ? phaseMatch[1] : '';
const phaseIds = [...phaseSection.matchAll(/\|\s*(P\d{1,2})\s*\|/g)].map((m) => m[1]);
const folderMap = { P0: 'phase-00', P01: 'phase-01', P02: 'phase-02', P03: 'phase-03', P04: 'phase-04', P05: 'phase-05', P06: 'phase-06', P07: 'phase-07', P08: 'phase-08', P09: 'phase-09', P10: 'phase-10' };
const missingPlans = [];
for (const pid of phaseIds) {
  const plansDir = join(ROOT, '.opencode/plans');
  const prefix = folderMap[pid] || `phase-${pid.toLowerCase()}`;
  const folder = readdirSync(plansDir).map((n) => join(plansDir, n)).find((p) => {
    const base = p.split('/').pop();
    return base === prefix || base.startsWith(prefix + '-');
  });
  if (!folder || !existsSync(folder)) { missingPlans.push(`${pid}: folder missing`); continue; }
  const mds = readdirSync(folder).filter((n) => n.endsWith('.md'));
  if (mds.length === 0) missingPlans.push(`${pid}: no step plan`);
}

let failed = false;
if (broken.length) { failed = true; console.error('Broken links:'); broken.forEach((b) => console.error(' - ' + b)); }
if (dupes.length) { failed = true; console.error('Duplicate IDs: ' + [...new Set(dupes)].join(', ')); }
if (missingIds.length) { failed = true; console.error('Missing IDs: ' + missingIds.join(', ')); }
if (extraIds.length) { failed = true; console.error('Unexpected IDs: ' + extraIds.join(', ')); }
if (missingPlans.length) { failed = true; console.error('Missing step plans:'); missingPlans.forEach((m) => console.error(' - ' + m)); }

if (failed) { process.exit(1); }
console.log(`plans:check OK — ${filesToScan.length} files, ${unique.size} IDs, ${phaseIds.length} phases.`);

export { filesToScan };
