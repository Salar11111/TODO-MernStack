import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { toast } from 'sonner';
import { useDeleteTodo, useUpdateTodo } from '../hooks/useTodos';
import { useCategoriesQuery } from '../hooks/useCategories';
import { LIMITS, parseTags, validateTitle } from '../utils/validation';

// Convert an ISO timestamp to a local Date at midnight of its calendar day,
// so date comparisons match what the user sees in the date picker.
function localDateFromISO(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dueBadge(todo) {
  if (!todo.dueDate) return null;
  const date = localDateFromISO(todo.dueDate);
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  if (todo.isCompleted) {
    return { label, className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' };
  }
  if (date.getTime() === today.getTime()) {
    return { label: 'Due today', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' };
  }
  if (date < today) {
    return { label: `Overdue: ${label}`, className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' };
  }
  return { label: `Due ${label}`, className: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' };
}

const priorityBadge = {
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
};

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

export function TodoItemContent({
  todo,
  setNodeRef,
  style,
  isDragging,
  dragHandleProps,
  selected,
  onToggleSelect,
}) {
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const { data: categories = [] } = useCategoriesQuery();
  const categoryMap = Object.fromEntries(categories.map((c) => [c._id, c]));

  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
  const [editTags, setEditTags] = useState((todo.tags || []).join(', '));
  const [editCategory, setEditCategory] = useState(todo.category || '');

  const badge = dueBadge(todo);
  const completedSubtasks = (todo.subtasks || []).filter((s) => s.isCompleted).length;
  const totalSubtasks = (todo.subtasks || []).length;

  const mutateOptions = {
    onError: (err) => toast.error(err.response?.data?.message || err.message || 'Something went wrong'),
  };

  const handleToggle = () => {
    updateTodo.mutate(
      { id: todo._id, patch: { isCompleted: !todo.isCompleted } },
      mutateOptions
    );
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    deleteTodo.mutate(todo._id, {
      ...mutateOptions,
      onSuccess: () => toast.success('Task deleted'),
    });
  };

  const handleSaveEdit = async () => {
    const validationError = validateTitle(editTitle);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    try {
      await updateTodo.mutateAsync({
        id: todo._id,
        patch: {
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          dueDate: editDueDate || null,
          tags: parseTags(editTags),
          category: editCategory || null,
        },
      });
      toast.success('Task updated');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update task');
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate ? todo.dueDate.slice(0, 10) : '');
    setEditTags((todo.tags || []).join(', '));
    setEditCategory(todo.category || '');
    setError('');
    setIsEditing(false);
  };

  const updateSubtasks = (next) => {
    updateTodo.mutate({ id: todo._id, patch: { subtasks: next } }, mutateOptions);
  };

  const toggleSubtask = (index) => {
    const next = todo.subtasks.map((s, i) =>
      i === index ? { ...s, isCompleted: !s.isCompleted } : s
    );
    updateSubtasks(next);
  };

  const removeSubtask = (index) => {
    updateSubtasks(todo.subtasks.filter((_, i) => i !== index));
  };

  const addSubtask = (e) => {
    e.preventDefault();
    const title = newSubtask.trim();
    if (!title) return;
    updateSubtasks([
      ...todo.subtasks,
      { title: title.slice(0, 100), isCompleted: false },
    ]);
    setNewSubtask('');
  };

  // ----- Edit mode -----
  if (isEditing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-blue-300 dark:border-blue-800"
      >
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={LIMITS.TITLE_MAX}
              className={inputClass}
              placeholder="Task title"
              aria-label="Edit task title"
            />
            <p className="text-xs text-gray-500 mt-1">{editTitle.length}/{LIMITS.TITLE_MAX}</p>
          </div>

          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={LIMITS.DESCRIPTION_MAX}
            className={inputClass}
            rows="2"
            placeholder="Task description"
            aria-label="Edit task description"
          />
          <p className="text-xs text-gray-500">{editDescription.length}/{LIMITS.DESCRIPTION_MAX}</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className={inputClass}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className={inputClass}
                  placeholder="work, home, urgent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              disabled={updateTodo.isPending}
              className="flex-1 bg-blue-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {updateTodo.isPending ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={updateTodo.isPending}
              className="flex-1 bg-gray-400 text-white font-semibold py-2 px-3 rounded-md hover:bg-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  // ----- View mode -----
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col gap-3 transition-all hover:shadow-md ${
        isDragging ? 'opacity-60 shadow-lg' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {dragHandleProps && (
          <button
            {...dragHandleProps}
            className="mt-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-grab active:cursor-grabbing p-1 rounded"
            aria-label="Drag to reorder"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 2a2 2 0 10.001 4.001A2 2 0 007 2zm0 6a2 2 0 10.001 4.001A2 2 0 007 8zm0 6a2 2 0 10.001 4.001A2 2 0 007 14zm6-8a2 2 0 10-.001-4.001A2 2 0 0013 6zm0 2a2 2 0 10.001 4.001A2 2 0 0013 8zm0 6a2 2 0 10.001 4.001A2 2 0 0013 14z" />
            </svg>
          </button>
        )}

        {onToggleSelect && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggleSelect(todo._id)}
            className="mt-1.5 h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer"
            aria-label={`Select task: ${todo.title}`}
          />
        )}

        <input
          type="checkbox"
          checked={todo.isCompleted}
          onChange={handleToggle}
          disabled={updateTodo.isPending}
          className="mt-1.5 h-5 w-5 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Mark "${todo.title}" as ${todo.isCompleted ? 'incomplete' : 'complete'}`}
        />

        <div className="flex-1 min-w-0">
          <h3 className={`font-medium break-words ${todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-100'}`}>
            {todo.title}
          </h3>
          {todo.description && (
            <p className={`text-sm mt-1 break-words ${todo.isCompleted ? 'text-gray-400 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
              {todo.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${priorityBadge[todo.priority]}`}>
              {todo.priority} priority
            </span>
            {badge && (
              <span className={`inline-block text-xs px-2 py-1 rounded-full font-medium ${badge.className}`}>
                {badge.label}
              </span>
            )}
            {(todo.tags || []).map((tag) => (
              <span key={tag} className="inline-block text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-medium">
                #{tag}
              </span>
            ))}
            {todo.category && categoryMap[todo.category] && (
              <span
                className="inline-block text-xs px-2 py-1 rounded-full font-medium text-white"
                style={{ backgroundColor: categoryMap[todo.category].color }}
              >
                {categoryMap[todo.category].name}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 p-2 rounded-md transition-colors"
            aria-label={`Edit task: ${todo.title}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteTodo.isPending}
            className={`p-2 rounded-md transition-colors ${
              confirmDelete
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950'
            }`}
            aria-label={`Delete task: ${todo.title}`}
          >
            {confirmDelete ? (
              <span className="text-xs font-semibold px-1">Sure?</span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {totalSubtasks > 0 && (
        <ul className="ml-8 space-y-1.5">
          {todo.subtasks.map((subtask, index) => (
            <li key={`${subtask.title}-${index}`} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={subtask.isCompleted}
                onChange={() => toggleSubtask(index)}
                disabled={updateTodo.isPending}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                aria-label={`Toggle subtask: ${subtask.title}`}
              />
              <span className={`text-sm flex-1 break-words ${subtask.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {subtask.title}
              </span>
              <button
                onClick={() => removeSubtask(index)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete subtask: ${subtask.title}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </li>
          ))}
          {completedSubtasks > 0 && (
            <li className="text-xs text-gray-500 pl-6">
              {completedSubtasks}/{totalSubtasks} subtasks done
            </li>
          )}
        </ul>
      )}

      {/* Add subtask */}
      <form onSubmit={addSubtask} className="ml-8 flex gap-2">
        <input
          type="text"
          value={newSubtask}
          onChange={(e) => setNewSubtask(e.target.value)}
          maxLength={100}
          placeholder="+ Add subtask"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!newSubtask.trim()}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </li>
  );
}

export function SortableTodoItem({ todo, disabled, selected, onToggleSelect }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: todo._id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TodoItemContent
      todo={todo}
      setNodeRef={setNodeRef}
      style={style}
      isDragging={isDragging}
      dragHandleProps={{
        ...attributes,
        ...listeners,
        ref: setActivatorNodeRef,
      }}
      selected={selected}
      onToggleSelect={onToggleSelect}
    />
  );
}

export default TodoItemContent;
