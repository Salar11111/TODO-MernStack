// Shared client-side validation rules (mirrors the server's Zod schemas)
export const LIMITS = {
  TITLE_MAX: 100,
  DESCRIPTION_MAX: 500,
  TAG_MAX: 30,
  MAX_TAGS: 10,
};

export function validateTitle(title) {
  if (!title || !title.trim()) return 'Title is required';
  if (title.length > LIMITS.TITLE_MAX) return `Title must be less than ${LIMITS.TITLE_MAX} characters`;
  return null;
}

export function parseTags(rawTags) {
  if (!rawTags) return [];
  const tags = rawTags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => tag.slice(0, LIMITS.TAG_MAX));
  return tags.slice(0, LIMITS.MAX_TAGS);
}
