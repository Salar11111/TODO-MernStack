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
        <label htmlFor={inputId} className="ui-label">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        value={value}
        maxLength={maxLength}
        className={cn('ui-input', error && 'ui-input-error', className)}
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
