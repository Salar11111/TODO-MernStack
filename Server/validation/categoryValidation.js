const { z } = require('zod');

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

const categoryFields = {
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(50, 'Category name cannot exceed 50 characters'),
  color: z
    .string()
    .trim()
    .regex(hexColorRegex, 'Color must be a valid hex code (#RRGGBB)')
    .optional(),
};

const createCategorySchema = z.object(categoryFields).strict();

const updateCategorySchema = z.object(categoryFields).strict().partial();

module.exports = { createCategorySchema, updateCategorySchema };
