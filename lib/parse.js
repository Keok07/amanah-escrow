import fs from 'fs';

export const parseBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

export const parseKeyValueList = (raw) => {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((entry) => String(entry || '').trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const idx = entry.indexOf(':');
      const alt = entry.indexOf('=');
      const splitAt = idx >= 0 ? idx : alt;
      if (splitAt <= 0) return null;
      const key = entry.slice(0, splitAt).trim();
      const value = entry.slice(splitAt + 1).trim();
      if (!key || !value) return null;
      return [key, value];
    })
    .filter(Boolean);
};

export const parseCsvList = (raw) => {
  if (!raw) return null;
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
};

export const parseJsonOrBase64 = (raw, options = {}) => {
  const allowObject = options.allowObject === true;
  const allowFile = options.allowFile === true;
  const filePathResolver =
    typeof options.filePathResolver === 'function' ? options.filePathResolver : null;
  const base64Prefix = typeof options.base64Prefix === 'string' ? options.base64Prefix : null;

  if (raw === undefined || raw === null || raw === '') return null;
  if (allowObject && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;

  let text = raw.trim();
  if (!text) return null;

  if (allowFile && text.startsWith('@')) {
    const source = text.slice(1);
    const resolvedPath = filePathResolver ? filePathResolver(source) : source;
    try {
      text = String(fs.readFileSync(resolvedPath, 'utf8') || '').trim();
      if (!text) return null;
    } catch (_e) {
      return null;
    }
  }

  if (base64Prefix && text.startsWith(base64Prefix)) text = text.slice(base64Prefix.length);

  if (text.startsWith('{')) {
    try {
      return JSON.parse(text);
    } catch (_e) {
      return null;
    }
  }

  try {
    const decoded = Buffer.from(text, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (_e) {
    return null;
  }
};
