import { Link } from 'react-router-dom';
import { BookOpen, Search, CheckSquare } from 'lucide-react';

interface ModuleCard {
  title: string;
  description: string;
  path: string;
  jobCount: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const MODULES: ModuleCard[] = [
  {
    title: 'Citation Management',
    description: 'Detect, parse, and validate citations across documents',
    path: '/editorial/citations',
    jobCount: 0,
    icon: BookOpen,
    color: 'blue',
  },
  {
    title: 'Plagiarism Detection',
    description: 'Semantic fingerprinting and paraphrase detection',
    path: '/editorial/plagiarism',
    jobCount: 0,
    icon: Search,
    color: 'amber',
  },
  {
    title: 'Style Validation',
    description: 'Chicago, APA, and custom house style checking',
    path: '/editorial/style',
    jobCount: 0,
    icon: CheckSquare,
    color: 'green',
  },
];

export function EditorialDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Analyses</p>
          <p className="text-2xl font-semibold">0</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Issues Found</p>
          <p className="text-2xl font-semibold">0</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Documents Processed</p>
          <p className="text-2xl font-semibold">0</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {MODULES.map((module) => {
          const IconComponent = module.icon;
          return (
            <Link
              key={module.path}
              to={module.path}
              className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center gap-3 mb-2">
                <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {module.title}
                </h3>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {module.description}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {module.jobCount} analyses
                </span>
                <span className="text-blue-600 text-sm font-medium">
                  Open →
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Activity
        </h3>
        <p className="text-sm text-gray-500">
          No recent analyses. Upload a document to get started.
        </p>
      </div>
    </div>
  );
}
