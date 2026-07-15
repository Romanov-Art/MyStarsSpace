import { Buffer } from 'node:buffer';

export interface ParsedDataUrl {
  mimeType: string;
  bytes: Buffer;
}

export function parseDataUrl(value: string): ParsedDataUrl {
  const match = value.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    const error = new Error('asset.data_url must be a base64 data URL');
    (error as Error & { statusCode?: number }).statusCode = 400;
    throw error;
  }

  return {
    mimeType: match[1],
    bytes: Buffer.from(match[2], 'base64')
  };
}
