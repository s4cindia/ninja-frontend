import { useState } from 'react';
import DocumentQueueView from '../../components/bootstrap/DocumentQueueView';
import AnalyticsDashboard from '../../components/bootstrap/AnalyticsDashboard';

type Tab = 'queue' | 'analytics';

export default function BootstrapConsolePage() {
  const [activeTab, setActiveTab] = useState<Tab>('queue');

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="border-b bg-white px-6 flex gap-0">
        {(
          [
            { id: 'queue', label: 'Document Queue' },
            { id: 'analytics', label: 'Analytics' },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'queue' ? (
          <div className="p-6">
            <DocumentQueueView />
          </div>
        ) : (
          <AnalyticsDashboard />
        )}
      </div>
    </div>
  );
}
