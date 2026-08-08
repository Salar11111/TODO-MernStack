import { cn } from '../../utils/cn';

const badgeVariants = {
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export function Badge({ children, variant = 'blue', className, ...props }) {
  return (
    <span
      className={cn(
        'inline-block text-xs px-2 py-1 rounded-full font-medium',
        badgeVariants[variant] || badgeVariants.blue,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
