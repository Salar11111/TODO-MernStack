const Category = require('../models/category');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all categories for the logged-in user, each with a todo count
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const Todo = require('../models/todo');

  const [categories, counts] = await Promise.all([
    Category.find({ user: userId }).sort({ position: 1, name: 1 }),
    Todo.aggregate([
      { $match: { user: userId, category: { $ne: null } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]),
  ]);

  const countById = Object.fromEntries(counts.map(({ _id, count }) => [String(_id), count]));

  res.json(categories.map((category) => ({
    ...category.toObject(),
    _count: countById[String(category._id)] || 0,
  })));
});

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private
const createCategory = asyncHandler(async (req, res) => {
  const count = await Category.countDocuments({ user: req.user._id });

  const category = await Category.create({
    name: req.body.name,
    color: req.body.color ?? '#3B82F6',
    user: req.user._id,
    position: count,
  });

  res.status(201).json(category);
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = asyncHandler(async (req, res) => {
  const updated = await Category.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    req.body,
    { returnDocument: 'after', runValidators: true }
  );

  if (!updated) {
    res.status(404);
    throw new Error('Category not found');
  }

  res.json(updated);
});

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  // Remove the category reference from all todos that belong to this user
  const Todo = require('../models/todo');
  await Todo.updateMany(
    { user: req.user._id, category: req.params.id },
    { $unset: { category: '' } }
  );

  res.json({ message: 'Category deleted', id: req.params.id });
});

// @desc    Reorder categories
// @route   PUT /api/categories/reorder
// @access  Private
const reorderCategories = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  const operations = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, user: req.user._id },
      update: { $set: { position: index } },
    },
  }));

  await Category.bulkWrite(operations);

  res.json({ message: 'Category order updated' });
});

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
};
