import { cn } from '../../utils/cn';

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-800', className)}
      {...props}
    />
  );
}

/** Skeleton that mimics a todo item card */
export function TodoSkeleton() {
  return (
    <li className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-start gap-3">
        {/* Drag handle + checkbox */}
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-5 rounded-md" />
        {/* Title + description */}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        {/* Action buttons */}
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      {/* Badges row */}
      <div className="flex gap-2 ml-8">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
    </li>
  );
}

export default Skeleton;
