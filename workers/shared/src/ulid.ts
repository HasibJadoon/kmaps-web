const CHARS = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TIME_CHARS = 10;
const RAND_CHARS = 16;

let lastMs = 0;
let lastRandChars: number[] = new Array(RAND_CHARS).fill(0);

function encodeTime(ms: number): string {
  let str = '';
  for (let i = TIME_CHARS - 1; i >= 0; i--) {
    str = CHARS[ms % 32] + str;
    ms = Math.floor(ms / 32);
  }
  return str;
}

function encodeRandom(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(RAND_CHARS));
  lastRandChars = Array.from(bytes).map((b) => b % 32);
  return lastRandChars.map((n) => CHARS[n]).join('');
}

function incrementRandom(): string {
  let done = false;
  for (let i = RAND_CHARS - 1; i >= 0 && !done; i--) {
    if (lastRandChars[i] < 31) {
      lastRandChars[i]++;
      done = true;
    } else {
      lastRandChars[i] = 0;
    }
  }
  if (!done) throw new Error('ULID random component overflow');
  return lastRandChars.map((n) => CHARS[n]).join('');
}

export function ulid(): string {
  const ms = Date.now();
  const rand = ms === lastMs ? incrementRandom() : encodeRandom();
  lastMs = ms;
  return encodeTime(ms) + rand;
}

export function typedId(module: string): string {
  return `${module}:${ulid()}`;
}

export function isUlid(s: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s);
}

export function isTypedRef(s: string): boolean {
  const colon = s.indexOf(':');
  if (colon <= 0) return false;
  return isUlid(s.slice(colon + 1));
}
