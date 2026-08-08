const { z } = require('zod');

const authSchema = {
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot be more than 50 characters'),
  email: z.email('Please provide a valid email').trim().toLowerCase(),
  // Base password rule (min 6) kept for backward compatibility on login.
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password cannot be more than 72 characters'),
};

// Stronger password rule used on registration and password reset.
// Requires min 8 chars with at least one uppercase letter, one number, and
// one special character.
const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password cannot be more than 72 characters')
  .refine((pw) => /[a-z]/.test(pw), 'Password must include a lowercase letter')
  .refine((pw) => /[A-Z]/.test(pw), 'Password must include an uppercase letter')
  .refine((pw) => /[0-9]/.test(pw), 'Password must include a number')
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), 'Password must include a special character');

const registerSchema = z
  .object({
    name: authSchema.name,
    email: authSchema.email,
    password: strongPassword,
  })
  .strict();

const loginSchema = z
  .object({
    email: authSchema.email,
    password: authSchema.password,
  })
  .strict();

const forgotPasswordSchema = z
  .object({
    email: authSchema.email,
  })
  .strict();

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: strongPassword,
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
