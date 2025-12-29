import { Settings as SettingsIcon } from 'lucide-react';
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
          <RemediationSettings />
        </div>
      </div>
    </div>
  );
}
