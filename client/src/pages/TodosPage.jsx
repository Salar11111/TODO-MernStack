import { useCallback, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import TodoForm from '../components/TodoForm';
import TodoFilters from '../components/TodoFilters';
import TodoList from '../components/TodoList';
import CategorySidebar from '../components/CategorySidebar';
import { Button } from '../components/ui/Button';
import { TodoSkeleton } from '../components/ui/Skeleton';
import { useCreateTodo, useReorderTodos, useTodosQuery, useStatsQuery, useBulkUpdateTodos, useBulkDeleteTodos } from '../hooks/useTodos';
import { useCategoriesQuery } from '../hooks/useCategories';
import { downloadFile, fetchAllTodos, parseImportFile, toCSV, toJSON } from '../utils/exportImport';

const DEFAULT_FILTERS = { status: 'all', priority: 'all', due: 'all', tag: 'all', search: '' };

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function TodosPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [sortBy, setSortBy] = useState('custom');
  const [page, setPage] = useState(1);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  const queryParams = useMemo(() => {
    const params = { page };
    if (filters.status !== 'all') params.status = filters.status;
    if (filters.priority !== 'all') params.priority = filters.priority;
    if (filters.due !== 'all') params.due = filters.due;
    if (filters.tag !== 'all') params.tag = filters.tag;
    if (filters.search.trim()) params.search = filters.search.trim();
    if (activeCategoryId) params.category = activeCategoryId;
    return params;
  }, [filters, page, activeCategoryId]);

  const { data, isLoading, isError, error, refetch } = useTodosQuery(queryParams);
  const { data: stats } = useStatsQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const createTodo = useCreateTodo();
  const reorderTodos = useReorderTodos();
  const bulkUpdate = useBulkUpdateTodos();
  const bulkDelete = useBulkDeleteTodos();

  const todos = useMemo(() => data?.todos ?? [], [data]);
  const pagination = data?.pagination;
  const isFilterActive = Object.keys(queryParams).length > 1;

  const updateFilters = useCallback((next) => {
    setFilters((prev) => (typeof next === 'function' ? next(prev) : next));
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  const isEmptyPage = Boolean(pagination && todos.length === 0 && pagination.total > 0 && page > 1);

  const sortedTodos = useMemo(() => {
    const list = [...todos];
    if (sortBy === 'priority') {
      list.sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2));
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [todos, sortBy]);

  const availableTags = useMemo(() => todos.flatMap((t) => t.tags || []), [todos]);

  const completionRate = stats?.completionRate ?? 0;
  const totalTasks = stats?.total ?? 0;

  // Selection helpers
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(todos.map((t) => t._id)));
  }, [todos]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleReorder = (orderedIds) => {
    reorderTodos.mutate(orderedIds, {
      onError: (err) => toast.error(err.response?.data?.message || err.message || 'Failed to reorder'),
    });
  };

  const handleBulkComplete = () => {
    const ids = [...selectedIds];
    bulkUpdate.mutate(
      { ids, patch: { isCompleted: true } },
      {
        onSuccess: () => {
          toast.success(`Marked ${ids.length} task${ids.length === 1 ? '' : 's'} complete`);
          clearSelection();
        },
        onError: (err) => toast.error(err.message || 'Bulk update failed'),
      }
    );
  };

  const handleBulkPriority = (e) => {
    const priority = e.target.value;
    if (!priority) return;
    const ids = [...selectedIds];
    bulkUpdate.mutate(
      { ids, patch: { priority } },
      {
        onSuccess: () => {
          toast.success(`Updated priority for ${ids.length} task${ids.length === 1 ? '' : 's'}`);
          setBulkPriority('');
          clearSelection();
        },
        onError: (err) => toast.error(err.message || 'Bulk update failed'),
      }
    );
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    if (!window.confirm(`Delete ${ids.length} task${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    bulkDelete.mutate(ids, {
      onSuccess: () => {
        toast.success(`Deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`);
        clearSelection();
      },
      onError: (err) => toast.error(err.message || 'Bulk delete failed'),
    });
  };

  const handleBulkCategory = (e) => {
    const value = e.target.value;
    if (!value) return;
    const ids = [...selectedIds];
    // "none" clears the category; otherwise treat as a category id
    const patch = { category: value === 'none' ? null : value };
    bulkUpdate.mutate(
      { ids, patch },
      {
        onSuccess: () => {
          toast.success(`Updated category for ${ids.length} task${ids.length === 1 ? '' : 's'}`);
          setBulkCategory('');
          clearSelection();
        },
        onError: (err) => toast.error(err.message || 'Bulk update failed'),
      }
    );
  };

  const handleExport = async (format) => {
    setExportMenuOpen(false);
    try {
      const all = await fetchAllTodos();
      if (all.length === 0) {
        toast.info('Nothing to export yet');
        return;
      }
      if (format === 'csv') downloadFile(toCSV(all), 'tasks.csv', 'text/csv');
      else downloadFile(toJSON(all), 'tasks.json', 'application/json');
      toast.success(`Exported ${all.length} tasks`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseImportFile(file);
      if (rows.length === 0) {
        toast.info('No valid tasks found in that file');
        return;
      }
      for (const row of rows) {
        await createTodo.mutateAsync(row);
      }
      toast.success(`Imported ${rows.length} tasks`);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      e.target.value = '';
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Tasks</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1" role="status" aria-live="polite">
            {todos.length} task{todos.length === 1 ? '' : 's'} shown
          </p>
        </div>
        <div className="flex items-center gap-2 relative">
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              className="px-3 py-2 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center gap-1.5"
              aria-label="Export or import tasks"
              aria-expanded={exportMenuOpen}
              aria-haspopup="true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Export</span>
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-1 z-20 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Export JSON
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      setExportMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Import File
                  </button>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </header>

      {/* Completion progress bar */}
      {totalTasks > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {Math.round(completionRate)}% complete
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionRate}%` }}
              role="progressbar"
              aria-valuenow={completionRate}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(completionRate)}% complete`}
            />
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-red-100 dark:bg-red-950 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6" role="alert">
          <p>{error?.message || 'Failed to load tasks.'}</p>
          <button onClick={() => refetch()} className="underline mt-1 font-semibold">
            Try Again
          </button>
        </div>
      )}

      <CategorySidebar
        activeCategoryId={activeCategoryId}
        onSelectCategory={(id) => {
          setActiveCategoryId(id);
          setPage(1);
          setSelectedIds(new Set());
        }}
      />

      <TodoForm categoryId={activeCategoryId} />

      <TodoFilters
        filters={filters}
        setFilters={updateFilters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        availableTags={availableTags}
      />

      {/* Select-all bar (only when there are tasks) */}
      {todos.length > 0 && (
        <div className="flex items-center gap-3 mb-3 text-sm">
          <label className="flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={selectedCount === todos.length && todos.length > 0}
              onChange={() => (selectedCount === todos.length ? clearSelection() : selectAll())}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 dark:border-gray-600 focus:ring-blue-500"
              aria-label="Select all tasks on this page"
            />
            {selectedCount > 0
              ? `${selectedCount} selected`
              : 'Select all'}
          </label>
        </div>
      )}

      {isLoading && todos.length === 0 ? (
        <ul className="space-y-3" aria-busy="true" aria-label="Loading tasks">
          <TodoSkeleton />
          <TodoSkeleton />
          <TodoSkeleton />
        </ul>
      ) : isEmptyPage ? (
        <div className="text-center py-10 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">
            You&apos;re past the last page of tasks.
          </p>
          <Button
            variant="ghost"
            onClick={() => setPage(Math.max(1, pagination.pages))}
            className="mt-3"
          >
            Go to last page
          </Button>
        </div>
      ) : (
        <TodoList
          todos={sortedTodos}
          filterActive={isFilterActive}
          sortable={sortBy === 'custom' && !isFilterActive && (pagination?.pages ?? 1) <= 1 && selectedCount === 0}
          onReorder={handleReorder}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      {pagination && pagination.pages > 1 && (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            size="sm"
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {pagination.pages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            size="sm"
          >
            Next
          </Button>
        </nav>
      )}

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-gray-900 dark:bg-gray-800 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-2 flex-wrap justify-center max-w-[calc(100vw-2rem)]"
          >
            <span className="text-sm font-medium mr-2">{selectedCount} selected</span>
            <Button size="sm" variant="secondary" onClick={handleBulkComplete} loading={bulkUpdate.isPending}>
              Mark Complete
            </Button>
            <select
              value={bulkPriority}
              onChange={handleBulkPriority}
              className="px-2 py-1.5 text-sm rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Change priority"
            >
              <option value="">Priority…</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={bulkCategory}
              onChange={handleBulkCategory}
              className="px-2 py-1.5 text-sm rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[140px]"
              aria-label="Change category"
            >
              <option value="">Category…</option>
              <option value="none">None</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>{cat.name}</option>
              ))}
            </select>
            <Button size="sm" variant="danger" onClick={handleBulkDelete} loading={bulkDelete.isPending}>
              Delete
            </Button>
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-white p-1.5"
              aria-label="Clear selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default TodosPage;
