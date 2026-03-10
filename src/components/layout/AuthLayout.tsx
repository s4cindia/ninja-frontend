import { Outlet } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="sr-only">Accessibility Validation Platform</h1>
          <p className="text-gray-600 text-sm mt-1">
            Accessibility Validation Platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
