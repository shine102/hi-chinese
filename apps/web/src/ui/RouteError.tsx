import { Link, type ErrorComponentProps } from '@tanstack/react-router';

export function RouteError({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div role="alert" className="my-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
      <h2 className="font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm">{message}</p>
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white"
        >
          Try again
        </button>
        <Link to="/" className="px-3 py-1.5 text-sm underline">
          Back to path
        </Link>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="py-8 text-center">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <Link to="/" className="mt-3 inline-block underline">
        Back to path
      </Link>
    </div>
  );
}
