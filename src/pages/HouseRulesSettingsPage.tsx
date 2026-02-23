/**
 * House Rules Settings Page
 *
 * Dedicated page for managing house style rules
 */

import { BookOpen } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { HouseRulesManager } from '@/components/style';

export default function HouseRulesSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', path: '/dashboard' },
            { label: 'Settings', path: '/settings' },
            { label: 'House Style Rules' },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary-600" />
            House Style Rules
          </h1>
          <p className="text-gray-600 mt-1">
            Create and manage custom style rules for your organization. These rules will be used
            during style validation to check documents against your house style guidelines.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <HouseRulesManager className="min-h-[600px]" />
        </div>
      </div>
    </div>
  );
}
