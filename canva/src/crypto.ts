import { createHash, randomBytes } from 'node:crypto';

function base64Url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function randomToken(bytes = 32): string {
  return base64Url(randomBytes(bytes));
}

export function codeChallenge(verifier: string): string {
  return base64Url(createHash('sha256').update(verifier).digest());
}
