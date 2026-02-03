import { Link } from 'react-router-dom';
import { BookOpen, Search, CheckSquare, ArrowRight } from 'lucide-react';

const modules = [
  {
    title: 'Citations',
    description: 'Manage references, validate citation formats, and ensure bibliography accuracy.',
    icon: BookOpen,
    path: '/editorial/citations',
    color: 'bg-blue-500',
  },
  {
    title: 'Plagiarism Detection',
    description: 'Scan documents for potential plagiarism and content originality issues.',
    icon: Search,
    path: '/editorial/plagiarism',
    color: 'bg-purple-500',
  },
  {
    title: 'Style Validation',
    description: 'Check documents against style guides and editorial standards.',
    icon: CheckSquare,
    path: '/editorial/style',
    color: 'bg-green-500',
  },
];

export function EditorialOverview() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Welcome to Editorial Services
        </h2>
        <p className="text-gray-600">
          Select a module below to start analyzing your documents, or upload a new file to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link
              key={module.title}
              to={module.path}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow group"
            >
              <div className={`inline-flex p-3 rounded-lg ${module.color} text-white mb-4`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {module.title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {module.description}
              </p>
              <span className="inline-flex items-center text-sm font-medium text-blue-600 group-hover:text-blue-700">
                Get Started
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <p className="text-sm text-gray-500 text-center py-8">
          No recent activity. Upload a document to get started.
        </p>
      </div>
    </div>
  );
}

export default EditorialOverview;
