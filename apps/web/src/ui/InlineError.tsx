export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="my-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-700 px-3 py-1.5 text-sm font-medium text-white"
        >
          Retry
        </button>
      )}
    </div>
  );
}
