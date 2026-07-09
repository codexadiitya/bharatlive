export default function NewsCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="h-44 w-full animate-pulse bg-muted/60" />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-16 animate-pulse rounded bg-muted/70" />
          <div className="h-3 w-10 animate-pulse rounded bg-muted/50" />
        </div>
        <div className="h-4 w-11/12 animate-pulse rounded bg-muted/70" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted/60" />
        <div className="mt-1 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted/40" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted/40" />
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
          <div className="h-3 w-12 animate-pulse rounded bg-muted/40" />
        </div>
      </div>
    </div>
  );
}

export function NewsCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <NewsCardSkeleton key={i} />
      ))}
    </div>
  );
}
