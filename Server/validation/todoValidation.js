const { z } = require('zod');

const priorityEnum = z.enum(['low', 'medium', 'high']);
const statusEnum = z.enum(['todo', 'in-progress', 'done']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const subtaskSchema = z.object({
  title: z.string().trim().min(1, 'Subtask title is required').max(100, 'Subtask title too long'),
  isCompleted: z.boolean().optional(),
});

const tagsSchema = z
  .array(z.string().trim().min(1, 'Tag cannot be empty').max(30, 'Tag too long'))
  .max(10, 'Too many tags');

// Fields shared by create and update. All create fields are optional here so the
// schema can be reused for updates; the controller applies defaults on create.
const baseTodoFields = {
  title: z
    .string()
    .trim()
    .min(1, 'Please provide a title')
    .max(100, 'Title cannot be more than 100 characters'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot be more than 500 characters')
    .optional(),
  priority: priorityEnum.optional(),
  status: statusEnum.optional(),
  isCompleted: z.boolean().optional(),
  dueDate: z
    .string()
    .regex(datePattern, 'Due date must be formatted as YYYY-MM-DD')
    .nullable()
    .optional(),
  tags: tagsSchema.optional(),
  subtasks: z.array(subtaskSchema).max(20, 'Too many subtasks').optional(),
  category: z
    .string()
    .min(1, 'Category id cannot be empty')
    .nullable()
    .optional(),
};

const createTodoSchema = z.object(baseTodoFields).strict();

const updateTodoSchema = z
  .object(baseTodoFields)
  .strict()
  .partial();

const reorderSchema = z
  .object({
    orderedIds: z
      .array(z.string().min(1))
      .min(1, 'orderedIds cannot be empty')
      .max(500, 'Too many items to reorder at once'),
  })
  .strict()
  .refine(({ orderedIds }) => new Set(orderedIds).size === orderedIds.length, {
    message: 'orderedIds cannot contain duplicates',
    path: ['orderedIds'],
  });

// Patch allowed on bulk update — a subset of updateTodoSchema (no title/description
// editing in bulk; focus on status/priority/tags/isCompleted).
const bulkPatchSchema = z
  .object({
    isCompleted: z.boolean().optional(),
    status: statusEnum.optional(),
    priority: priorityEnum.optional(),
    tags: tagsSchema.optional(),
    category: z.string().min(1).nullable().optional(),
  })
  .strict();

const bulkUpdateSchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1, 'ids cannot be empty')
      .max(500, 'Too many items to update at once'),
    patch: bulkPatchSchema,
  })
  .strict();

const bulkDeleteSchema = z
  .object({
    ids: z
      .array(z.string().min(1))
      .min(1, 'ids cannot be empty')
      .max(500, 'Too many items to delete at once'),
  })
  .strict();

module.exports = {
  createTodoSchema,
  updateTodoSchema,
  reorderSchema,
  bulkUpdateSchema,
  bulkDeleteSchema,
};
