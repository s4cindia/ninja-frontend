export function Files() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Files</h1>
        <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          Upload File
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">No files uploaded yet.</p>
      </div>
    </div>
  );
}
