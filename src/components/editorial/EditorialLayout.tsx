import { Outlet } from 'react-router-dom';

export function EditorialLayout() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Editorial Services
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Citation management and document validation tools
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
}

export default EditorialLayout;
