import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'span', 'br'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeText(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

export function sanitizeFilePath(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  const sanitized = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
  return sanitized
    .replace(/\.\.\//g, '')
    .replace(/\.\.\\/g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim();
}
