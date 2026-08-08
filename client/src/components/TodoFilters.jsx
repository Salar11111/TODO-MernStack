import { useEffect, useMemo, useRef, useState } from 'react';

const selectClass =
  'px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

const labelClass = 'block text-sm font-medium mb-1';

export default function TodoFilters({
  filters,
  setFilters,
  sortBy,
  setSortBy,
  availableTags,
  onReset,
}) {
  const [search, setSearch] = useState('');
  const isFirstRun = useRef(true);

  // Debounce the search input into the filters
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setFilters((f) => ({ ...f, search }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setFilters]);

  const tagOptions = useMemo(() => Array.from(new Set(availableTags)).sort(), [availableTags]);
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.due !== 'all' ||
    filters.tag !== 'all' ||
    filters.search !== '';

  const update = (patch) => setFilters((f) => ({ ...f, ...patch }));

  const handleReset = () => {
    setSearch('');
    setFilters({ status: 'all', priority: 'all', due: 'all', tag: 'all', search: '' });
    setSortBy('custom');
    onReset?.();
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-800 mb-6">
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="search" className={labelClass}>
            Search
          </label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="min-w-[130px]">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => update({ status: e.target.value })}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="min-w-[130px]">
          <label htmlFor="priority" className={labelClass}>
            Priority
          </label>
          <select
            id="priority"
            value={filters.priority}
            onChange={(e) => update({ priority: e.target.value })}
            className={selectClass}
          >
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="min-w-[130px]">
          <label htmlFor="due" className={labelClass}>
            Due
          </label>
          <select
            id="due"
            value={filters.due}
            onChange={(e) => update({ due: e.target.value })}
            className={selectClass}
          >
            <option value="all">Any</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>

        <div className="min-w-[130px]">
          <label htmlFor="tag" className={labelClass}>
            Tag
          </label>
          <select
            id="tag"
            value={filters.tag}
            onChange={(e) => update({ tag: e.target.value })}
            className={selectClass}
          >
            <option value="all">All tags</option>
            {tagOptions.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[150px]">
          <label htmlFor="sort" className={labelClass}>
            Sort
          </label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={selectClass}
          >
            <option value="custom">Custom order</option>
            <option value="date">Date (newest)</option>
            <option value="priority">Priority</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3">
          <button
            onClick={handleReset}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
