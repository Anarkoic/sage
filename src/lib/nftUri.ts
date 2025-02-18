import invalid from '@/images/invalid.png';
import missing from '@/images/missing.png';
import { MAX_CONTENT_SIZE, sanitizeText, sanitizeJson } from './security';

const imageTypes = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',  // Keep SVG support for sandboxed rendering
];

const videoTypes = ['video/webm', 'video/mp4'];

const textTypes = ['text/plain'];

export function nftUri(mimeType: string | null, data: string | null): string {
  if (data === null || mimeType === null) return missing;

  // Size check for all content
  if (data.length > MAX_CONTENT_SIZE) {
    console.warn('Content exceeds size limit');
    return invalid;
  }

  if (textTypes.includes(mimeType) || isJson(mimeType)) {
    try {
      // Try to decode as base64 first
      const binaryStr = atob(data);
      // Convert binary string to Uint8Array for proper UTF-8 handling
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      // Decode as UTF-8 and sanitize
      const decoded = new TextDecoder().decode(bytes);
      return isJson(mimeType) ? sanitizeJson(decoded) : sanitizeText(decoded);
    } catch {
      // If decoding fails, assume it's already plain text and sanitize
      return isJson(mimeType) ? sanitizeJson(data) : sanitizeText(data);
    }
  }

  if (!imageTypes.concat(videoTypes).includes(mimeType)) return invalid;

  // SVGs will be handled specially by the NftPreview component
  // All other binary content is returned as-is with data URL
  return `data:${mimeType};base64,${data}`;
}

export function isImage(mimeType: string | null): boolean {
  return mimeType !== null && imageTypes.includes(mimeType);
}

export function isVideo(mimeType: string | null): boolean {
  return mimeType !== null && videoTypes.includes(mimeType);
}

export function isText(mimeType: string | null): boolean {
  return mimeType === 'text/plain';
}

export function isJson(mimeType: string | null): boolean {
  return mimeType === 'application/json';
}

export function isSvg(mimeType: string | null): boolean {
  return mimeType === 'image/svg+xml';
}
