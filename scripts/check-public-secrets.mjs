// Read-only guard for a publicly hosted, local-first PWA.
// Scans files tracked in the current commit, not Git history or deployed bundles.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SECRET_FILE = /(?:^|\/)\.env(?:\.(?!example$)[^/]+)?$|(?:^|\/)(?:id_rsa|id_ed25519|key\.properties|GoogleService-Info\.plist|google-services\.json)$|(?:^|\/)(?:service-account[^/]*\.json|[^/]*\.(?:pem|p12|pfx|keystore|jks|key))$/i;
const SIGNATURES = [
  ['Supabase privileged key', /\bsb_secret_[A-Za-z0-9_-]{8,}/],
  ['GitHub personal token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Private key block', /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['Literal backend service-role secret', /\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'`][^"'`\r\n]{16,}/i],
];
function findings(path, contents) {
  const found = [];
  if (SECRET_FILE.test(path)) found.push('credential-like filename');
  if (contents != null) for (const [label, pattern] of SIGNATURES) {
    if (pattern.test(contents)) found.push(label);
  }
  return found;
}
if (process.argv.includes('--self-test')) {
  assert.deepEqual(findings('.env.production'), ['credential-like filename']);
  assert.deepEqual(findings('config/.env.example'), []);
  assert.ok(findings('src/main.ts', 'ghp_' + 'A'.repeat(36)).includes('GitHub personal token'));
  assert.ok(findings('src/main.ts', 'AKIA' + 'A'.repeat(16)).includes('AWS access key'));
  assert.ok(findings('src/main.ts', 'sb_secret_' + 'A'.repeat(20)).includes('Supabase privileged key'));
  assert.ok(findings('src/main.ts', 'sb_publishable_' + 'A'.repeat(20)).length === 0);
  console.log('Public secret guard self-tests passed.');
  process.exit(0);
}
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean);
const problems = [];
let checked = 0;
for (const path of files) {
  // The guard's own synthetic sample patterns must not self-trigger.
  if (path === 'scripts/check-public-secrets.mjs') continue;
  let contents = null;
  const buffer = readFileSync(path);
  if (!buffer.includes(0) && buffer.byteLength <= 2_000_000) {
    contents = buffer.toString('utf8');
  }
  const hits = findings(path, contents);
  if (hits.length) problems.push({ path, hits });
  checked++;
}
if (problems.length) {
  for (const { path, hits } of problems) {
    console.error(`Potential exposure in ${path}: ${hits.join(', ')}`);
  }
  console.error('Do not merge. Remove exposure and rotate any real leaked credential.');
  process.exit(1);
}
console.log(`Public secret guard passed for ${checked} tracked files.`);
