import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function Jobs() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Jobs' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No validation jobs yet.</p>
      </div>
    </div>
  );
}
