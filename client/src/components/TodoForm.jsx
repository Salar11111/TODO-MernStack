import { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useCreateTodo } from '../hooks/useTodos';
import { LIMITS, parseTags, validateTitle } from '../utils/validation';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

function TodoForm({ onCreated, categoryId }) {
  const createTodo = useCreateTodo();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate('');
    setTags('');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateTitle(title);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    try {
      await createTodo.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || null,
        tags: parseTags(tags),
        category: categoryId || null,
      });
      toast.success('Task added');
      reset();
      setExpanded(false);
      onCreated?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add task');
      toast.error('Failed to add task');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 mb-6">
      {/* Collapsible quick-add or expanded form */}
      <div className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={LIMITS.TITLE_MAX}
          placeholder="Quick add task... (press Enter or click + for more options)"
          className="flex-1"
          onFocus={() => setExpanded(true)}
          aria-label="Task title"
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={expanded ? 'Show less options' : 'Show more options'}
          title={expanded ? 'Less options' : 'More options'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${expanded ? 'rotate-45' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              <Input
                label="Description (Optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={LIMITS.DESCRIPTION_MAX}
                placeholder="Add some details..."
                aria-label="Task description"
              />

              <div className="grid sm:grid-cols-3 gap-4">
                <Select
                  label="Priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>

                <Input
                  label="Due Date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />

                <Input
                  label="Tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="work, home, urgent"
                />
              </div>

              {error && (
                <div className="bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 rounded text-sm" role="alert">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  loading={createTodo.isPending}
                  disabled={!title.trim()}
                  className="flex-1"
                >
                  {createTodo.isPending ? 'Adding...' : 'Add Task'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setExpanded(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

export default TodoForm;
