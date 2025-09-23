import { inflateRaw, deflateRaw } from 'pako';
import crypto from 'node:crypto';

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = Buffer.from(base64, 'base64').toString('binary');
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

export interface PobDecoded {
  xml: string;
  hash: string;
}

export function decodePobCode(code: string): PobDecoded {
  const bytes = base64ToUint8Array(code.replace(/\s+/g, ''));
  const inflated = inflateRaw(bytes, { to: 'string' }) as string;
  const hash = crypto.createHash('sha1').update(inflated).digest('hex');
  return { xml: inflated, hash };
}

export function encodePobXml(xml: string): string {
  const compressed = deflateRaw(xml, { level: 9 }) as Uint8Array;
  return uint8ArrayToBase64(compressed);
}
