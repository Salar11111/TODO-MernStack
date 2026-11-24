import { cn } from '../../utils/cn';

/* One filled primary and one quiet secondary. Semantic variants only tint
   the quiet button's text; they are not new button shapes. */
const variants = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-quiet',
  ghost: 'ui-btn-quiet',
  danger: 'ui-btn-quiet ui-btn-danger',
};

const sizes = {
  sm: 'ui-btn-sm',
  md: '',
  lg: '',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn('ui-btn', variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;
