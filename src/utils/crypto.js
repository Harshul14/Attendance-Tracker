// End-to-end encryption: the key lives only in the share link's #fragment,
// which browsers never send to any server. The storage service only sees ciphertext.
const ALGO = 'AES-GCM';

// Gzip before encrypting keeps the stored blob small (free services limit payload size).
const canCompress = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
async function pipe(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const toBase64 = (bytes) => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toUrlSafe = (b64) => b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromUrlSafe = (text) => text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4);

export function generateKey() {
  return toUrlSafe(toBase64(crypto.getRandomValues(new Uint8Array(32))));
}

const importKey = (key) => crypto.subtle.importKey('raw', fromBase64(fromUrlSafe(key)), ALGO, false, ['encrypt', 'decrypt']);

/** Encrypts any JSON value into a JSON string envelope. */
export async function encrypt(value, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  let data = new TextEncoder().encode(JSON.stringify(value));
  if (canCompress) data = await pipe(data, new CompressionStream('gzip'));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: ALGO, iv }, await importKey(key), data));
  return JSON.stringify({ v: 1, c: canCompress ? 1 : 0, iv: toBase64(iv), ct: toBase64(cipher) });
}

export async function decrypt(envelopeText, key) {
  const { iv, ct, c } = JSON.parse(envelopeText);
  let plain = new Uint8Array(await crypto.subtle.decrypt({ name: ALGO, iv: fromBase64(iv) }, await importKey(key), fromBase64(ct)));
  if (c) plain = await pipe(plain, new DecompressionStream('gzip'));
  return JSON.parse(new TextDecoder().decode(plain));
}
