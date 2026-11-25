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

// Registration and password reset use the same strong rule as the server
// (Server/validation/authValidation.js): 8-72 chars with upper, lower, number
// and symbol. Keep the messages identical so client and server agree.
export const PASSWORD_RULES = [
  { message: 'Password must be at least 8 characters', test: (pw) => pw.length >= 8 },
  { message: 'Password must include a lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { message: 'Password must include an uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { message: 'Password must include a number', test: (pw) => /[0-9]/.test(pw) },
  { message: 'Password must include a special character', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

export function passwordErrors(password) {
  const pw = typeof password === 'string' ? password : '';
  if (!pw) return ['Password is required'];

  const errors = [];
  if (pw.length > 72) errors.push('Password cannot be more than 72 characters');
  PASSWORD_RULES.forEach((rule) => {
    if (!rule.test(pw)) errors.push(rule.message);
  });
  return errors;
}

// First failing rule, matching the server's validation message order.
export function validatePassword(password) {
  return passwordErrors(password)[0] || null;
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
