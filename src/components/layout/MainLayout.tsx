import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/ui/Logo';
import { FeedbackButton } from '@/components/feedback';
import { 
  Home, 
  FileText, 
  CheckCircle, 
  LogOut,
  Upload,
  BookOpen,
  ClipboardCheck,
  Image,
  Wrench,
  Layers,
  MessageSquare,
  PenTool
} from 'lucide-react';

type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

export function MainLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navSections: NavSection[] = [
    {
      items: [
        { to: '/dashboard', icon: Home, label: 'Dashboard' },
        { to: '/products', icon: FileText, label: 'Products' },
        { to: '/jobs', icon: CheckCircle, label: 'Jobs' },
        { to: '/files', icon: Upload, label: 'Files' },
      ],
    },
    {
      title: 'Accessibility',
      items: [
        { to: '/epub', icon: BookOpen, label: 'EPUB Accessibility' },
        { to: '/pdf', icon: FileText, label: 'PDF Accessibility' },
        { to: '/acr/workflow', icon: ClipboardCheck, label: 'ACR Workflow' },
        { to: '/test/alt-text-generator', icon: Image, label: 'Alt-Text Generator' },
      ],
    },
    {
      title: 'Editorial',
      items: [
        { to: '/editorial', icon: PenTool, label: 'Editorial Services' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { to: '/remediation', icon: Wrench, label: 'Remediation' },
        { to: '/batches', icon: Layers, label: 'Batch Processing' },
        { to: '/feedback', icon: MessageSquare, label: 'Feedback' },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <Logo size="sm" showNinjaText={true} />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.firstName} {user?.lastName}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 bg-white border-r min-h-[calc(100vh-57px)] p-4">
          <nav className="space-y-4">
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                        isActive(item.to)
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
                {sectionIndex < navSections.length - 1 && (
                  <div className="mt-4 border-t border-gray-200" />
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      <FeedbackButton variant="floating" position="bottom-right" />
    </div>
  );
}
