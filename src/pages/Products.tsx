import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function Products() {
  return (
    <div>
      <Breadcrumbs items={[{ label: 'Products' }]} />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          Add Product
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No products yet. Upload your first PDF or EPUB to get started.</p>
      </div>
    </div>
  );
}
