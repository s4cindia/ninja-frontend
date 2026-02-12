/**
 * ScanLevelBanner Example
 *
 * Visual examples and test cases for the ScanLevelBanner component.
 * Run with: npm run dev and navigate to this example route.
 */

import React, { useState } from 'react';
import { ScanLevelBanner } from './ScanLevelBanner';
import type { ScanLevel, ValidatorType } from '@/types/scan-level.types';

export const ScanLevelBannerExample: React.FC = () => {
  const [isScanning1, setIsScanning1] = useState(false);
  const [isScanning2, setIsScanning2] = useState(false);
  const [selectedLevel1, setSelectedLevel1] = useState<ScanLevel>('basic');
  const [selectedLevel2, setSelectedLevel2] = useState<ScanLevel>('basic');

  const handleReScan1 = (scanLevel: ScanLevel, customValidators?: ValidatorType[]) => {
    console.log('Re-scan triggered:', { scanLevel, customValidators });
    setIsScanning1(true);

    // Simulate API call
    setTimeout(() => {
      setIsScanning1(false);
      setSelectedLevel1(scanLevel);
      console.log('Re-scan complete!');
    }, 3000);
  };

  const handleReScan2 = (scanLevel: ScanLevel, customValidators?: ValidatorType[]) => {
    console.log('Re-scan triggered:', { scanLevel, customValidators });
    setIsScanning2(true);

    // Simulate API call
    setTimeout(() => {
      setIsScanning2(false);
      setSelectedLevel2(scanLevel);
      console.log('Re-scan complete!');
    }, 3000);
  };

  const resetExample1 = () => {
    setIsScanning1(false);
    setSelectedLevel1('basic');
  };

  const resetExample2 = () => {
    setIsScanning2(false);
    setSelectedLevel2('basic');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ScanLevelBanner Examples</h1>
          <p className="text-gray-600">
            Interactive examples showing the ScanLevelBanner component in different states.
          </p>
        </div>

        {/* Example 1: Normal State */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Example 1: Normal State</h2>
              <p className="text-sm text-gray-600">Banner shown after Basic scan completion</p>
            </div>
            <button
              onClick={resetExample1}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="mb-2 text-sm text-gray-600">
              Current scan level: <span className="font-medium">{selectedLevel1}</span>
            </div>
            <ScanLevelBanner
              currentScanLevel={selectedLevel1}
              onReScan={handleReScan1}
              isScanning={isScanning1}
            />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>✅ Try expanding the Comprehensive and Custom sections</p>
            <p>✅ Select different validators in Custom mode</p>
            <p>✅ Click "Run Comprehensive Scan" to see loading state</p>
          </div>
        </section>

        {/* Example 2: Loading State */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Example 2: Loading State</h2>
              <p className="text-sm text-gray-600">Banner during re-scan operation</p>
            </div>
            <button
              onClick={resetExample2}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Reset
            </button>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="mb-2 text-sm text-gray-600">
              Current scan level: <span className="font-medium">{selectedLevel2}</span>
            </div>
            <ScanLevelBanner
              currentScanLevel={selectedLevel2}
              onReScan={handleReScan2}
              isScanning={isScanning2}
            />
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>✅ Button shows "Scanning..." during operation</p>
            <p>✅ Button is disabled while scanning</p>
            <p>✅ Spinner icon appears in button</p>
          </div>
        </section>

        {/* Example 3: Hidden State */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Example 3: Hidden State</h2>
            <p className="text-sm text-gray-600">
              Banner should not appear after Comprehensive scan (component returns null)
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="mb-2 text-sm text-gray-600">
              Current scan level: <span className="font-medium">comprehensive</span>
            </div>
            <ScanLevelBanner
              currentScanLevel="comprehensive"
              onReScan={() => {}}
              isScanning={false}
            />
            <div className="mt-4 text-center text-gray-500 italic">
              {/* This message appears because banner is hidden */}
              Banner is hidden (component returned null)
            </div>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <p>✅ No banner shown when currentScanLevel is "comprehensive"</p>
            <p>✅ User doesn't need to run deeper scan - they already have the deepest</p>
          </div>
        </section>

        {/* API Mock Example */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">API Integration Example</h2>
            <p className="text-sm text-gray-600">
              How to integrate with your API
            </p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm text-green-400">
              <code>{`const handleReScan = async (
  scanLevel: ScanLevel,
  customValidators?: ValidatorType[]
) => {
  setIsReScanning(true);
  setIsPolling(true);

  try {
    // Call re-scan API
    await api.post(\`/pdf/job/\${jobId}/re-scan\`, {
      scanLevel,
      customValidators,
    });

    // Poll for updated results
    toast.success(\`Running \${scanLevel} scan...\`);
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to start re-scan';
    toast.error(message);
    setIsReScanning(false);
    setIsPolling(false);
  }
};`}</code>
            </pre>
          </div>
        </section>

        {/* Props Documentation */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Props Documentation</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Prop
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Required
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">
                    currentScanLevel
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">ScanLevel</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Current scan level. Banner hidden if "comprehensive".
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">onReScan</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Function</td>
                  <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Callback when user clicks re-scan button. Receives (scanLevel, customValidators?).
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">isScanning</td>
                  <td className="px-4 py-3 text-sm text-gray-600">boolean</td>
                  <td className="px-4 py-3 text-sm text-gray-600">No</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Set to true during re-scan operation. Shows loading state.
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-mono text-gray-900">className</td>
                  <td className="px-4 py-3 text-sm text-gray-600">string</td>
                  <td className="px-4 py-3 text-sm text-gray-600">No</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    Additional CSS classes for styling.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScanLevelBannerExample;
