export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-12" aria-live="polite" aria-label="Loading page">
      <div className="h-9 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="aspect-[3/4] animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}
