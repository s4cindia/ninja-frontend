import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  BookOpen, 
  Search, 
  CheckSquare, 
  FileText 
} from 'lucide-react';

const EDITORIAL_TABS = [
  { path: '/editorial', label: 'Overview', icon: LayoutDashboard, end: true },
  { path: '/editorial/upload', label: 'Upload', icon: Upload, end: false },
  { path: '/editorial/citations', label: 'Citations', icon: BookOpen, end: false },
  { path: '/editorial/plagiarism', label: 'Plagiarism', icon: Search, end: false },
  { path: '/editorial/style', label: 'Style', icon: CheckSquare, end: false },
  { path: '/editorial/reports', label: 'Reports', icon: FileText, end: false },
] as const;

export function EditorialLayout() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Editorial Services
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Citation management, plagiarism detection, and style validation
            </p>
          </div>
          <NavLink 
            to="/editorial/upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            New Analysis
          </NavLink>
        </div>
        
        <nav className="flex flex-wrap gap-1 mt-4 -mb-px" role="tablist" aria-label="Editorial Services Navigation">
          {EDITORIAL_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                role="tab"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {tab.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
      
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <Outlet />
      </div>
    </div>
  );
}

export default EditorialLayout;
