const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const { z } = require('zod');
const {
  createCategorySchema,
  updateCategorySchema,
} = require('../validation/categoryValidation');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} = require('../controllers/categoryControllers');

const reorderSchema = z
  .object({
    orderedIds: z
      .array(z.string().min(1))
      .min(1)
      .max(100, 'Too many categories to reorder'),
  })
  .strict()
  .refine(({ orderedIds }) => new Set(orderedIds).size === orderedIds.length, {
    message: 'orderedIds cannot contain duplicates',
    path: ['orderedIds'],
  });

// All category routes are private
router.use(protect);

router
  .route('/')
  .get(getCategories)
  .post(validate(createCategorySchema), createCategory);

router.put('/reorder', validate(reorderSchema), reorderCategories);

router
  .route('/:id')
  .put(validate(updateCategorySchema), updateCategory)
  .delete(deleteCategory);

module.exports = router;
