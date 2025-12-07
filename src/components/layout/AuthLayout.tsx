import { Outlet } from 'react-router-dom';
import { S4CarlisleLogo } from '@/components/ui/Logo';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">🥷</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Ninja Platform</h1>
          <p className="text-gray-600 text-sm mt-1">
            Accessibility Validation Platform
          </p>
          <div className="mt-4 pt-4 border-t flex justify-center">
            <S4CarlisleLogo size="md" />
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
