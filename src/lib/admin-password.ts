import { scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
export async function verifyPassword(password: string, encoded: string) {
  const [salt, hex] = encoded.split(':');
  if (!/^[a-f0-9]{32}$/.test(salt ?? '') || !/^[a-f0-9]{128}$/.test(hex ?? '') || password.length > 256) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hex, 'hex'));
}
