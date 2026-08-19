export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function BirdCardSkeleton() {
  return (
    <div className="paper-card p-4 space-y-3">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto section-padding space-y-8">
      <Skeleton className="h-10 w-1/3" />
      <Skeleton className="h-6 w-2/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BirdCardSkeleton />
        <BirdCardSkeleton />
        <BirdCardSkeleton />
      </div>
    </div>
  );
}
