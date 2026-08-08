import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCategoriesQuery, useCreateCategory, useDeleteCategory, useUpdateCategory } from '../hooks/useCategories';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const PRESET_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function CategorySidebar({
  activeCategoryId,
  onSelectCategory,
}) {
  const { data: categories = [], isLoading } = useCategoriesQuery();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createCategory.mutate(
      { name: newName.trim(), color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          setNewColor(PRESET_COLORS[0]);
          setIsAdding(false);
        },
      }
    );
  };

  const startEdit = (cat) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    updateCategory.mutate(
      { id: editingId, patch: { name: editName.trim(), color: editColor } },
      { onSuccess: () => setEditingId(null) }
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const handleDelete = (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? Tasks in this category will be unassigned.`)) return;
    deleteCategory.mutate(cat._id);
  };

  const totalCount = categories.reduce((sum, c) => sum + (c._count ?? 0), 0);

  return (
    <aside className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Categories</h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Add category"
          title="Add category"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* "All" filter */}
      <button
        onClick={() => onSelectCategory(null)}
        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
          activeCategoryId === null
            ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600" />
        All Tasks
        <span className="ml-auto text-xs text-gray-400">{totalCount}</span>
      </button>

      {/* Category list */}
      <ul className="mt-1 space-y-0.5">
        {isLoading ? (
          <li className="px-3 py-2 text-sm text-gray-400">Loading…</li>
        ) : (
          categories.map((cat) =>
            editingId === cat._id ? (
              <li key={cat._id} className="px-3 py-2">
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Category name"
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${
                          editColor === c ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={saveEdit} loading={updateCategory.isPending}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </li>
            ) : (
              <li key={cat._id} className="group">
                <button
                  onClick={() => onSelectCategory(cat._id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${
                    activeCategoryId === cat._id
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate flex-1">{cat.name}</span>
                  <span className="text-xs text-gray-400">{cat._count ?? 0}</span>
                  {/* Edit / delete buttons — visible on hover */}
                  <span className="hidden group-hover:flex items-center gap-0.5 ml-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(cat); }}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(cat); }}
                      className="p-0.5 rounded text-gray-400 hover:text-red-500"
                      aria-label={`Delete ${cat.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                </button>
              </li>
            )
          )
        )}
      </ul>

      {/* Add new category form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleCreate}
            className="mt-2 overflow-hidden"
          >
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name"
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${
                      newColor === c ? 'border-gray-800 dark:border-gray-200 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" type="submit" loading={createCategory.isPending} disabled={!newName.trim()}>
                  Create
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </aside>
  );
}
