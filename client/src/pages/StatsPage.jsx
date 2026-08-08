import { Link } from 'react-router-dom';
import { useStatsQuery } from '../hooks/useTodos';
import Spinner from '../components/Spinner';

const cardClass =
  'bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5';

function SummaryCards({ stats }) {
  const cards = [
    { label: 'Total tasks', value: stats.total, color: 'text-gray-900 dark:text-gray-100' },
    { label: 'Active', value: stats.active, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Completed', value: stats.completed, color: 'text-green-600 dark:text-green-400' },
    { label: 'Overdue', value: stats.overdue, color: 'text-red-600 dark:text-red-400' },
    { label: 'Completion rate', value: `${stats.completionRate}%`, color: 'text-purple-600 dark:text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => (
        <div key={card.label} className={cardClass}>
          <p className={`text-2xl font-extrabold ${card.color}`}>{card.value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

function ActivityChart({ activity }) {
  const max = Math.max(1, ...activity.map((a) => a.count));

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Completed over the last 7 days</h2>
      <div className="flex items-end gap-2 h-40">
        {activity.map(({ date, count }) => {
          const height = Math.round((count / max) * 100);
          return (
            <div key={date} className="flex-1 flex flex-col items-center gap-1" title={`${date}: ${count} completed`}>
              <span className="text-xs text-gray-500">{count || ''}</span>
              <div
                className={`w-full rounded-t ${count > 0 ? 'bg-blue-500 dark:bg-blue-400' : 'bg-gray-200 dark:bg-gray-700'}`}
                style={{ height: `${Math.max(4, height)}%` }}
              />
              <span className="text-[10px] text-gray-500 truncate">
                {new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityBreakdown({ stats }) {
  const rows = [
    { key: 'high', label: 'High', color: 'bg-red-500' },
    { key: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { key: 'low', label: 'Low', color: 'bg-green-500' },
  ];
  const max = Math.max(1, ...rows.map((r) => stats.priorityBreakdown[r.key]));

  return (
    <div className={cardClass}>
      <h2 className="text-lg font-semibold mb-4">Tasks by priority</h2>
      <div className="space-y-4">
        {rows.map((row) => {
          const count = stats.priorityBreakdown[row.key];
          const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
          return (
            <div key={row.key}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{row.label}</span>
                <span className="text-gray-500">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${count > 0 ? Math.max(4, (count / max) * 100) : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsPage() {
  const { data: stats, isLoading, isError } = useStatsQuery();

  if (isError) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 dark:text-red-400 mb-4">Could not load your statistics.</p>
        <Link to="/" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
          Back to tasks
        </Link>
      </div>
    );
  }

  if (isLoading || !stats) {
    return <Spinner label="Crunching the numbers..." />;
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Your Stats</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          A snapshot of how you&apos;re doing.
        </p>
      </header>

      <div className="space-y-6">
        <SummaryCards stats={stats} />
        <div className="grid lg:grid-cols-2 gap-6">
          <ActivityChart activity={stats.activity} />
          <PriorityBreakdown stats={stats} />
        </div>

        {stats.total === 0 && (
          <div className={cardClass + ' text-center'}>
            <p className="text-gray-500 dark:text-gray-400">
              Add a few tasks to see useful statistics here.
            </p>
            <Link to="/" className="inline-block mt-2 text-blue-600 dark:text-blue-400 font-medium hover:underline">
              Create your first task
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default StatsPage;
