import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Logo } from '@/components/ui/Logo';
import { FeedbackButton } from '@/components/feedback';
import { NotificationBell } from '@/components/NotificationBell';
import { useNotificationToast } from '@/hooks/useNotificationToast';
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed';
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
  PenTool,
  Settings,
  BookCheck,
  Bot,
  BarChart2,
  Shield,
  Users,
  Database,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type NavItem = {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  /** If set, the nav item is highlighted when the pathname starts with this prefix instead of `to`. */
  activePrefix?: string;
  /** If true, this item is hidden from users with the OPERATOR role. */
  operatorHidden?: boolean;
};

type NavSection = {
  title?: string;
  items: NavItem[];
};

export function MainLayout() {
  useNotificationToast();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggle: toggleSidebar } = useSidebarCollapsed();
  const isOperator = user?.role === 'OPERATOR';

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
        { to: '/settings/house-rules', icon: BookCheck, label: 'Style Rules' },
      ],
    },
    {
      title: 'Tools',
      items: [
        { to: '/remediation', icon: Wrench, label: 'Remediation' },
        { to: '/batches', icon: Layers, label: 'Batch Processing' },
        {
          to: '/workflow/batch/new',
          icon: Bot,
          label: 'Agentic Batch',
          activePrefix: '/workflow/batch',
          operatorHidden: true,
        },
        { to: '/feedback', icon: MessageSquare, label: 'Feedback', operatorHidden: true },
        { to: '/reports/time', icon: BarChart2, label: 'Time Reports', activePrefix: '/reports' },
        { to: '/settings/workflow', icon: Settings, label: 'Workflow Settings' },
      ],
    },
    {
      title: 'Admin',
      items: [
        { to: '/admin/corpus', icon: Database, label: 'Corpus Management', activePrefix: '/admin/corpus' },
        { to: '/admin/users', icon: Users, label: 'User Management', activePrefix: '/admin/users' },
        { to: '/bootstrap', icon: Shield, label: 'Bootstrap Console', activePrefix: '/bootstrap' },
      ],
    },
  ];

  const isActive = (item: NavItem) => {
    const checkPath = item.activePrefix ?? item.to;
    if (checkPath === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(checkPath);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <Logo size="sm" showNinjaLogo={true} />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user?.firstName} {user?.lastName}
            </span>
            <NotificationBell />
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

      <div className="flex h-[calc(100vh-57px)]">
        <aside
          className={`flex flex-col bg-white border-r h-full transition-all duration-200 ease-in-out shrink-0 ${
            collapsed ? 'w-[60px]' : 'w-64'
          }`}
        >
          <nav className={`flex-1 space-y-1 overflow-y-auto overflow-x-hidden ${collapsed ? 'p-1.5' : 'p-4 space-y-4'}`}>
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && !collapsed && (
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section.title}
                    </h3>
                  </div>
                )}
                {collapsed && sectionIndex > 0 && (
                  <hr className="my-2 mx-2 border-gray-200" />
                )}
                <div className="space-y-1">
                  {section.items.filter((item) => !(isOperator && item.operatorHidden)).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center rounded-md transition-colors ${
                        collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2'
                      } ${
                        isActive(item)
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  ))}
                </div>
                {!collapsed && sectionIndex < navSections.length - 1 && (
                  <div className="mt-4 border-t border-gray-200" />
                )}
              </div>
            ))}
          </nav>
          <button
            onClick={toggleSidebar}
            className={`flex items-center gap-2 p-3 border-t border-gray-200 bg-gray-50 hover:bg-gray-200 text-gray-600 transition-colors ${
              collapsed ? 'justify-center' : 'px-4'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-xs font-medium">Collapse</span>
              </>
            )}
          </button>
        </aside>

        <main className="flex-1 min-w-0 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      <FeedbackButton variant="floating" position="bottom-right" />
    </div>
  );
}
