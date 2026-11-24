import { cn } from '../../utils/cn';

/* Status colours are tokens; tags and neutral labels share one badge recipe. */
const badgeVariants = {
  red: 'ui-badge-danger',
  yellow: 'ui-badge-warn',
  amber: 'ui-badge-warn',
  green: 'ui-badge-good',
  blue: 'ui-badge-accent',
  purple: 'ui-badge-accent',
  gray: 'ui-badge-neutral',
};

export function Badge({ children, variant = 'blue', className, ...props }) {
  return (
    <span
      className={cn('ui-badge', badgeVariants[variant] || badgeVariants.blue, className)}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
