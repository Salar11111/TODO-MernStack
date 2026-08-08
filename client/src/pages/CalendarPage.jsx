import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAllTodosQuery } from '../hooks/useTodos';
import { useCategoriesQuery } from '../hooks/useCategories';
import { Badge } from '../components/ui/Badge';
import { TodoSkeleton } from '../components/ui/Skeleton';
import { cn } from '../utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const priorityVariant = { high: 'red', medium: 'yellow', low: 'green' };

// Build a 6-row calendar grid for the given month, padded with prev/next month days
function buildCalendarGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells = [];
  // Previous month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, daysInPrevMonth - i),
      inMonth: false,
    });
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Next month padding to fill 6 rows (42 cells)
  let nextDay = 1;
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay++), inMonth: false });
  }
  return cells;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarPage() {
  const { data: todos, isLoading } = useAllTodosQuery();
  const { data: categories = [] } = useCategoriesQuery();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  const cells = useMemo(() => buildCalendarGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  // Map of YYYY-MM-DD -> todos due that day
  const todosByDate = useMemo(() => {
    const map = {};
    (todos || []).forEach((t) => {
      if (!t.dueDate) return;
      const key = t.dueDate.slice(0, 10); // already YYYY-MM-DD from the API
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [todos]);

  const todayKey = dateKey(today);
  const selectedTodos = selectedDate ? todosByDate[selectedDate] || [] : [];
  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c._id, c])),
    [categories]
  );

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-6">Calendar</h1>
        <TodoSkeleton />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Tasks with due dates shown by day
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Previous month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-semibold min-w-[140px] text-center">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="p-2 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Next month"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={() => {
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            const key = dateKey(cell.date);
            const dayTodos = todosByDate[key] || [];
            const isToday = key === todayKey;
            const hasOverdue = dayTodos.some((t) => !t.isCompleted && cell.date < today && cell.inMonth);

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(key)}
                className={cn(
                  'min-h-[72px] sm:min-h-[88px] p-1.5 rounded-md border text-left flex flex-col gap-1 transition-colors',
                  cell.inMonth
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'bg-gray-50/50 dark:bg-gray-900/30 border-transparent text-gray-400',
                  selectedDate === key && 'ring-2 ring-blue-500',
                  isToday && 'border-blue-500'
                )}
                aria-label={`${cell.date.toDateString()}, ${dayTodos.length} tasks`}
              >
                <span
                  className={cn(
                    'text-xs font-medium',
                    isToday && 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center'
                  )}
                >
                  {cell.date.getDate()}
                </span>
                {dayTodos.length > 0 && (
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {dayTodos.slice(0, 2).map((t) => (
                      <span
                        key={t._id}
                        className={cn(
                          'text-[10px] leading-tight truncate px-1 py-0.5 rounded',
                          hasOverdue && !t.isCompleted
                            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            : t.isCompleted
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 line-through'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        )}
                      >
                        {t.title}
                      </span>
                    ))}
                    {dayTodos.length > 2 && (
                      <span className="text-[10px] text-gray-500">+{dayTodos.length - 2} more</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'long', month: 'long', day: 'numeric',
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {selectedTodos.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tasks due on this day.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedTodos.map((t) => (
                    <li key={t._id} className="flex items-center gap-2 text-sm">
                      <span className={`flex-1 ${t.isCompleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-200'}`}>
                        {t.title}
                      </span>
                      <Badge variant={priorityVariant[t.priority] || 'blue'}>{t.priority}</Badge>
                      {t.category && categoryMap[t.category] && (
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: categoryMap[t.category].color }}
                        >
                          {categoryMap[t.category].name}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
