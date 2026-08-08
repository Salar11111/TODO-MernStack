import { cn } from '../../utils/cn';

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'text-center py-12 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700',
        className
      )}
    >
      {icon && <div className="mb-4 text-gray-300 dark:text-gray-600">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-500 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default EmptyState;
