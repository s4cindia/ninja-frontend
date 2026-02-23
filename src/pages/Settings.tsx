import { Settings as SettingsIcon, BookOpen, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { RemediationSettings } from '@/components/settings/RemediationSettings';

export default function Settings() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Settings' },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-primary-600" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure your preferences and application settings
          </p>
        </div>

        <div className="space-y-6">
          {/* House Style Rules Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">House Style Rules</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Create and manage custom style rules for your organization. Define terminology
                    preferences, capitalization rules, and other style guidelines.
                  </p>
                </div>
              </div>
              <Link
                to="/settings/house-rules"
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-colors"
              >
                Manage Rules
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Existing Remediation Settings */}
          <RemediationSettings />
        </div>
      </div>
    </div>
  );
}
