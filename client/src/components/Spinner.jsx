export default function Spinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 dark:border-blue-400"></div>
      {label && <p className="mt-3 text-gray-600 dark:text-gray-400">{label}</p>}
    </div>
  );
}
