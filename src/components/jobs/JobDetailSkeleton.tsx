function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ComplianceScoreSkeleton() {
  return (
    <div className="flex flex-col items-center p-4">
      <SkeletonBox className="w-28 h-28 rounded-full" />
      <SkeletonBox className="w-24 h-4 mt-2" />
    </div>
  );
}

export function SeveritySummarySkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex flex-col items-center">
          <SkeletonBox className="w-12 h-12 rounded-lg" />
          <SkeletonBox className="w-16 h-3 mt-2" />
        </div>
      ))}
    </div>
  );
}

export function IssuesTableSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonBox className="w-full h-10" />
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonBox key={i} className="w-full h-12" />
      ))}
    </div>
  );
}

export function JobDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ComplianceScoreSkeleton />
        <div className="md:col-span-2">
          <SeveritySummarySkeleton />
        </div>
      </div>
      <IssuesTableSkeleton />
    </div>
  );
}

export default JobDetailSkeleton;
