// A domain worker trusts the X-KM-* headers the gateway sets, so it must be reachable only
// through the gateway's service binding: no workers.dev URL, no route of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const WORKERS = join(__dirname, '..', '..');
const DOMAIN = ['ar-linguistics', 'arabic', 'content', 'core', 'quran', 'studio', 'worldview'];

for (const w of DOMAIN) {
  test(`${w} is reachable only through the gateway`, () => {
    const toml = readFileSync(join(WORKERS, w, 'wrangler.toml'), 'utf8');
    assert.match(toml, /^workers_dev\s*=\s*false/m, `${w}: workers_dev must be false`);
    assert.doesNotMatch(toml, /^\s*(\[\[routes\]\]|routes\s*=|route\s*=)/m, `${w}: must have no routes`);
  });
}
