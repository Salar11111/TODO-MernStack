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
        <label htmlFor={selectId} className="ui-label">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={cn('ui-input', error && 'ui-input-error', className)}
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
