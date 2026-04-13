"use client";

/* Reusable skeleton component for loading states */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`animate-pulse bg-[var(--border)] rounded-xl ${className}`} style={style} />
  );
}

/* Pre-built skeleton layouts */
export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <Skeleton className="w-12 h-12 rounded-xl mb-4" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-3 w-64 mb-6" />
      <div className="flex items-end gap-3 h-56">
        {[40, 65, 30, 80, 55].map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <Skeleton className="h-5 w-40 mb-2" />
      <Skeleton className="h-3 w-60 mb-6" />
      <div className="space-y-3">
        <div className="flex gap-4 pb-3 border-b border-[var(--border)]">
          {[40, 200, 80, 80, 60, 70].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonHeatmap() {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
      <Skeleton className="h-5 w-52 mb-2" />
      <Skeleton className="h-3 w-72 mb-6" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-[var(--border)] p-5">
            <Skeleton className="h-4 w-16 mb-2" />
            <Skeleton className="h-9 w-12 mb-1" />
            <Skeleton className="h-3 w-20 mb-3" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonClusterCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-6 w-8 rounded-lg" />
            </div>
          </div>
          <div className="p-5 space-y-2.5">
            <Skeleton className="h-3 w-24 mb-3" />
            {[...Array(3)].map((_, j) => (
              <Skeleton key={j} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonIssueCards({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-4 md:w-48">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div>
                <Skeleton className="h-4 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
            <div className="flex items-center gap-2.5 md:w-40">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
            <div className="ml-auto">
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
