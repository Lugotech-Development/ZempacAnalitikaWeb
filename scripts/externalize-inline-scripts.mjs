// Post-build step for the CSP in firebase.json (`script-src 'self'`, `style-src 'self'`).
//
// The static export inlines Next's RSC payload as <script>self.__next_f.push(…)</script>
// tags, and a static site can't use per-request nonces. So each page's run of inline
// scripts is moved, unchanged and in order, into one same-origin file named by its
// content hash, loaded by a parser-blocking <script src> at the same spot — same
// execution order, no inline script left for the CSP to block.
//
// Then it guards the CSP: the build fails if any page still has an inline script or an
// inline `style` attribute (both blocked in production — e.g. next/image prerenders one).
//
// Idempotent: runs after `next build` (npm `postbuild`) and again as Firebase `predeploy`.
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');
const ASSET_DIR = '_next/static/csp';

const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;
const isExecutable = attrs => !/\bsrc\s*=/.test(attrs) && !/\btype\s*=\s*["']?application\/(ld\+)?json/i.test(attrs);

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : e.name.endsWith('.html') ? [p] : [];
  });
}

/** Contiguous runs (only whitespace between) of inline executable scripts. */
function inlineRuns(html) {
  const runs = [];
  let current = null;
  for (const m of html.matchAll(SCRIPT_RE)) {
    const [tag, attrs, body] = m;
    if (!isExecutable(attrs)) {
      current = null;
      continue;
    }
    if (attrs.trim() !== '') throw new Error(`inline <script${attrs}> has attributes this step doesn't handle`);
    if (current && html.slice(current.end, m.index).trim() === '') {
      current.end = m.index + tag.length;
      current.bodies.push(body);
    } else {
      current = { start: m.index, end: m.index + tag.length, bodies: [body] };
      runs.push(current);
    }
  }
  return runs;
}

mkdirSync(join(OUT, ASSET_DIR), { recursive: true });
const problems = [];
let moved = 0;

for (const file of htmlFiles(OUT)) {
  const name = relative(OUT, file);
  let html = readFileSync(file, 'utf8');
  try {
    // Replace back to front so earlier offsets stay valid.
    for (const run of inlineRuns(html).reverse()) {
      const js = run.bodies.join(';\n');
      const hash = createHash('sha256').update(js).digest('hex').slice(0, 20);
      writeFileSync(join(OUT, ASSET_DIR, `${hash}.js`), js);
      html = `${html.slice(0, run.start)}<script src="/${ASSET_DIR}/${hash}.js"></script>${html.slice(run.end)}`;
      moved++;
    }
  } catch (e) {
    problems.push(`${name}: ${e.message}`);
    continue;
  }
  writeFileSync(file, html);

  if (inlineRuns(html).length > 0) problems.push(`${name}: inline <script> left after externalizing`);
  for (const [attr] of html.matchAll(/<[a-z][^>]*\sstyle="[^"]*"/gi)) problems.push(`${name}: inline style attribute ${attr.slice(0, 80)}…`);
}

if (problems.length > 0) {
  console.error(`\n✗ CSP check failed — these would be blocked by the Content-Security-Policy in firebase.json:\n  ${problems.join('\n  ')}\n`);
  process.exit(1);
}
console.log(`✓ CSP: ${moved} inline script block(s) externalized; no inline scripts or style attributes left.`);
