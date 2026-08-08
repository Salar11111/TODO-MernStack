const mongoose = require('mongoose');

// Define the shape of our Todo data
const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      maxlength: [100, 'Subtask title cannot be more than 100 characters'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const todoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A todo must belong to a user'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
      default: '',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    // Workflow status for the Kanban board. Separate from isCompleted so the
    // list view keeps its binary toggle while the board can show 3 columns.
    // When status is 'done', isCompleted is kept in sync by the controller.
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'done'],
      default: 'todo',
    },
    // Set when the todo is marked complete, cleared when reopened.
    // Powers the 7-day activity chart on the stats page.
    completedAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    // Optional reference to a Category for grouping / filtering
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    // Used for drag-and-drop ordering
    position: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient filtering/sorting per user
todoSchema.index({ user: 1, position: 1, createdAt: -1 });

// Index for filtering by workflow status (Kanban board)
todoSchema.index({ user: 1, status: 1 });

// Index for category filtering
todoSchema.index({ user: 1, category: 1 });

// Partial index for the 7-day completion activity query
todoSchema.index(
  { user: 1, completedAt: -1 },
  { partialFilterExpression: { completedAt: { $type: 'date' } } }
);

// Create and export the model (guard against double registration in tests)
module.exports = mongoose.models.Todo || mongoose.model('Todo', todoSchema);
