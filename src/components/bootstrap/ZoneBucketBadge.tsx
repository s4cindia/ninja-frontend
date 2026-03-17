type Bucket = 'GREEN' | 'AMBER' | 'RED';

interface ZoneBucketBadgeProps {
  bucket: Bucket;
  size?: 'sm' | 'md';
}

const CONFIG: Record<Bucket, { label: string; className: string }> = {
  GREEN: {
    label: 'Green',
    className: 'bg-green-100 text-green-700 border border-green-300',
  },
  AMBER: {
    label: 'Amber',
    className: 'bg-amber-100 text-amber-700 border border-amber-300',
  },
  RED: {
    label: 'Red',
    className: 'bg-red-100 text-red-700 border border-red-300',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 rounded-full',
  md: 'text-sm px-3 py-1 rounded-full',
};

export default function ZoneBucketBadge({ bucket, size = 'sm' }: ZoneBucketBadgeProps) {
  const config = CONFIG[bucket];
  return (
    <span
      className={`inline-flex items-center font-medium ${SIZE_CLASSES[size]} ${config.className}`}
      aria-label={`Reconciliation bucket: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
