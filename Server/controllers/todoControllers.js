const Todo = require('../models/todo');
const asyncHandler = require('../middleware/asyncHandler');

// Local day boundaries so due-date filters match the client's local-date rendering
const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

// Keep isCompleted and status in sync:
// - toggling isCompleted maps to status done/todo
// - moving a card to 'done' sets isCompleted true; otherwise false
const syncStatusFields = (patch) => {
  if (typeof patch.isCompleted === 'boolean') {
    patch.completedAt = patch.isCompleted ? new Date() : null;
    if (patch.status === undefined) {
      patch.status = patch.isCompleted ? 'done' : 'todo';
    }
  }
  if (patch.status !== undefined) {
    const isDone = patch.status === 'done';
    // Only override isCompleted when the caller didn't explicitly set it
    if (typeof patch.isCompleted !== 'boolean') {
      patch.isCompleted = isDone;
      patch.completedAt = isDone ? new Date() : null;
    }
  }
  return patch;
};

// @desc    Get todos for the logged-in user with filters, search, and pagination
// @route   GET /api/todos
// @access  Private
const getTodos = asyncHandler(async (req, res) => {
  const { status, priority, due, tag, search, category, page = 1, limit = 50 } = req.query;

  const filter = { user: req.user._id };

  if (priority && ['low', 'medium', 'high'].includes(priority)) {
    filter.priority = priority;
  }
  if (status === 'active') filter.isCompleted = false;
  if (status === 'completed') filter.isCompleted = true;

  if (due === 'overdue') {
    filter.isCompleted = false;
    filter.dueDate = { $lt: startOfDay() };
  } else if (due === 'today') {
    filter.dueDate = { $gte: startOfDay(), $lte: endOfDay() };
  } else if (due === 'upcoming') {
    filter.dueDate = { $gt: endOfDay() };
  }

  if (tag) filter.tags = tag;
  if (category) filter.category = category;

  if (search && search.trim()) {
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { tags: regex }];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const [todos, total] = await Promise.all([
    Todo.find(filter)
      .sort({ position: 1, createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum),
    Todo.countDocuments(filter),
  ]);

  res.json({
    todos,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

// @desc    Create a new todo
// @route   POST /api/todos
// @access  Private
const createTodo = asyncHandler(async (req, res) => {
  const count = await Todo.countDocuments({ user: req.user._id });
  const status = req.body.status ?? 'todo';

  const newTodo = await Todo.create({
    title: req.body.title,
    description: req.body.description ?? '',
    priority: req.body.priority ?? 'medium',
    isCompleted: req.body.isCompleted ?? status === 'done',
    status,
    completedAt: req.body.isCompleted || status === 'done' ? new Date() : null,
    dueDate: req.body.dueDate ?? null,
    tags: req.body.tags ?? [],
    subtasks: req.body.subtasks ?? [],
    category: req.body.category ?? null,
    user: req.user._id,
    position: count,
  });

  res.status(201).json(newTodo);
});

// @desc    Update a todo (toggle completion, edit details, add subtasks, etc.)
// @route   PUT /api/todos/:id
// @access  Private
const updateTodo = asyncHandler(async (req, res) => {
  const patch = syncStatusFields(req.body); // Already whitelisted + stripped by Zod validation

  const updatedTodo = await Todo.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    patch,
    { returnDocument: 'after', runValidators: true }
  );

  if (!updatedTodo) {
    res.status(404);
    throw new Error('Todo not found');
  }

  res.json(updatedTodo);
});

// @desc    Bulk update multiple todos (e.g. mark several complete, change priority)
// @route   PUT /api/todos/bulk
// @access  Private
const bulkUpdateTodos = asyncHandler(async (req, res) => {
  const { ids, patch } = req.body;

  // Reuse the same sync logic as updateTodo
  const update = syncStatusFields({ ...patch });

  const result = await Todo.updateMany(
    { _id: { $in: ids }, user: req.user._id },
    { $set: update }
  );

  res.json({ message: 'Bulk update complete', modifiedCount: result.modifiedCount });
});

// @desc    Delete a todo
// @route   DELETE /api/todos/:id
// @access  Private
const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, user: req.user._id });

  if (!todo) {
    res.status(404);
    throw new Error('Todo not found');
  }

  res.json({ message: 'Todo deleted successfully', id: req.params.id });
});

// @desc    Bulk delete multiple todos
// @route   DELETE /api/todos/bulk
// @access  Private
const bulkDeleteTodos = asyncHandler(async (req, res) => {
  const { ids } = req.body;

  const result = await Todo.deleteMany({ _id: { $in: ids }, user: req.user._id });

  res.json({ message: 'Bulk delete complete', deletedCount: result.deletedCount });
});

// @desc    Persist drag-and-drop ordering
// @route   PUT /api/todos/reorder
// @access  Private
const reorderTodos = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  const operations = orderedIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, user: req.user._id },
      update: { $set: { position: index } },
    },
  }));

  await Todo.bulkWrite(operations);

  res.json({ message: 'Order updated successfully' });
});

// @desc    Get quick stats for the dashboard
// @route   GET /api/todos/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const base = { user: userId };

  const [total, completed, byPriority, overdue, completedLast7Days, byCategory] = await Promise.all([
    Todo.countDocuments(base),
    Todo.countDocuments({ ...base, isCompleted: true }),
    Todo.aggregate([
      { $match: base },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
    Todo.countDocuments({ ...base, isCompleted: false, dueDate: { $lt: startOfDay() } }),
    Todo.aggregate([
      {
        $match: {
          user: userId,
          completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Todo.aggregate([
      { $match: { ...base, category: { $ne: null } } },
      {
        $group: { _id: '$category', total: { $sum: 1 }, completed: { $sum: { $cond: ['$isCompleted', 1, 0] } } },
      },
    ]),
  ]);

  const priorityBreakdown = { low: 0, medium: 0, high: 0 };
  byPriority.forEach(({ _id, count }) => {
    if (priorityBreakdown[_id] !== undefined) priorityBreakdown[_id] = count;
  });

  const activity = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const found = completedLast7Days.find((item) => item._id === key);
    activity.push({ date: key, count: found ? found.count : 0 });
  }

  res.json({
    total,
    completed,
    active: total - completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    priorityBreakdown,
    overdue,
    activity,
    byCategory,
  });
});

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  bulkUpdateTodos,
  deleteTodo,
  bulkDeleteTodos,
  reorderTodos,
  getStats,
};
