import { useState } from 'react';
import { Settings, RotateCcw, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  useRemediationConfig,
  useUpdateRemediationConfig,
  useResetRemediationConfig,
} from '@/hooks/useRemediationConfig';

export function RemediationSettings() {
  const { data: config, isLoading, error } = useRemediationConfig();
  const updateMutation = useUpdateRemediationConfig();
  const resetMutation = useResetRemediationConfig();
  const [showSaved, setShowSaved] = useState(false);

  const handleToggleColorContrast = async () => {
    if (!config) return;

    try {
      await updateMutation.mutateAsync({
        colorContrastAutoFix: !config.colorContrastAutoFix,
      });
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 2000);
    } catch (err) {
      console.error('Failed to reset config:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        Unable to load remediation settings. Using default configuration.
      </Alert>
    );
  }

  const isAutoFixEnabled = config?.colorContrastAutoFix ?? true;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary-600" />
          Remediation Settings
        </CardTitle>
        <CardDescription>
          Configure how accessibility issues are handled during remediation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Color Contrast Handling</h3>
          
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label
                  htmlFor="color-contrast-toggle"
                  className="text-sm font-medium text-gray-900 cursor-pointer"
                >
                  Auto-fix color contrast issues
                </label>
                <p
                  id="color-contrast-description"
                  className="text-sm text-gray-500 mt-1"
                >
                  When enabled, color contrast issues are automatically corrected during
                  remediation to meet WCAG 2.1 AA (4.5:1 ratio). Disable if you prefer
                  manual review of color changes.
                </p>
              </div>
              
              <button
                id="color-contrast-toggle"
                type="button"
                role="switch"
                aria-checked={isAutoFixEnabled}
                aria-describedby="color-contrast-description"
                onClick={handleToggleColorContrast}
                disabled={updateMutation.isPending}
                className={`
                  relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
                  border-2 border-transparent transition-colors duration-200 ease-in-out
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isAutoFixEnabled ? 'bg-primary-600' : 'bg-gray-200'}
                `}
              >
                <span className="sr-only">Auto-fix color contrast</span>
                <span
                  aria-hidden="true"
                  className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full
                    bg-white shadow ring-0 transition duration-200 ease-in-out
                    ${isAutoFixEnabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Current mode:</span>
              {isAutoFixEnabled ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <CheckCircle className="h-3 w-3" />
                  Auto-Fix
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                  Manual Review
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-2"
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Reset to Defaults
          </Button>

          {showSaved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Settings saved
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RemediationSettings;
