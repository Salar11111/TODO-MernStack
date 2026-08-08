const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A category must belong to a user'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      trim: true,
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    color: {
      type: String,
      default: '#3B82F6', // blue-500
      match: [/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (#RRGGBB)'],
    },
    position: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Efficient per-user sorting
categorySchema.index({ user: 1, position: 1 });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
