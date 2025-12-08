import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/s4carlisle-logo.avif" 
              alt="S4Carlisle Publishing Services" 
              className="h-12 w-auto object-contain"
            />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Ninja Platform</h1>
          <p className="text-gray-600 text-sm mt-1">
            Accessibility Validation Platform
          </p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
