import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Select = forwardRef(function Select(
  { label, error, className, id, children, ...props },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn(
          'w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          error
            ? 'border-red-400 dark:border-red-600'
            : 'border-gray-300 dark:border-gray-700',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${selectId}-error`} className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Select;
