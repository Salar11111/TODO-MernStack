import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input(
  { label, error, maxLength, value, className, id, ...props },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const showCounter = maxLength !== undefined && value !== undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        value={value}
        maxLength={maxLength}
        className={cn(
          'w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500',
          error
            ? 'border-red-400 dark:border-red-600'
            : 'border-gray-300 dark:border-gray-700',
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      <div className="flex justify-between mt-1">
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        {showCounter && (
          <p className="text-xs text-gray-500 ml-auto">
            {(typeof value === 'string' ? value.length : 0)}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
});

export default Input;
