/**
 * ScanLevelBanner Component
 *
 * Displays a banner on the audit results page offering users the option
 * to run a deeper scan (Comprehensive or Custom) if they initially ran Basic.
 *
 * Features:
 * - Shows current scan level
 * - Radio buttons for Comprehensive/Custom selection
 * - Expandable sections showing what's included
 * - Triggers re-scan without requiring re-upload
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  ScanLevel,
  SCAN_LEVEL_CONFIGS,
  ValidatorType,
  VALIDATOR_METADATA,
} from '@/types/scan-level.types';

export interface ScanLevelBannerProps {
  currentScanLevel: ScanLevel;
  onReScan: (scanLevel: ScanLevel, customValidators?: ValidatorType[]) => void;
  isScanning?: boolean;
  className?: string;
}

export const ScanLevelBanner: React.FC<ScanLevelBannerProps> = ({
  currentScanLevel,
  onReScan,
  isScanning = false,
  className,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<'comprehensive' | 'custom'>('comprehensive');
  const [showComprehensiveDetails, setShowComprehensiveDetails] = useState(false);
  const [showCustomDetails, setShowCustomDetails] = useState(false);
  const [customValidators, setCustomValidators] = useState<ValidatorType[]>([
    'structure',
    'alt-text',
    'tables',
  ]);

  // Auto-expand custom section when selected for better UX
  useEffect(() => {
    if (selectedLevel === 'custom') {
      setShowCustomDetails(true);
    }
  }, [selectedLevel]);

  // Don't show banner if already ran comprehensive
  if (currentScanLevel === 'comprehensive') {
    return null;
  }

  const handleReScan = () => {
    if (selectedLevel === 'custom') {
      onReScan('custom', customValidators);
    } else {
      onReScan('comprehensive');
    }
  };

  const toggleValidator = (validator: ValidatorType) => {
    setCustomValidators((prev) => {
      if (prev.includes(validator)) {
        // Must have at least one validator selected
        if (prev.length === 1) return prev;
        return prev.filter((v) => v !== validator);
      } else {
        return [...prev, validator];
      }
    });
  };

  const comprehensiveConfig = SCAN_LEVEL_CONFIGS.comprehensive;
  const allValidators: ValidatorType[] = [
    'structure',
    'alt-text',
    'contrast',
    'tables',
    'headings',
    'reading-order',
    'lists',
    'language',
    'metadata',
  ];

  return (
    <Card className={cn('border-2 border-primary-200 bg-primary-50', className)}>
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <Sparkles className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Want a deeper analysis?
            </h3>
            <p className="text-sm text-gray-700 mb-4">
              You ran a{' '}
              <Badge variant="info" className="mx-1">
                {SCAN_LEVEL_CONFIGS[currentScanLevel].name}
              </Badge>
              . Run a more comprehensive scan to uncover additional accessibility issues.
            </p>

            {/* Scan level options */}
            <div className="space-y-3">
              {/* Comprehensive option */}
              <div
                className={cn(
                  'border-2 rounded-lg p-3 transition-all cursor-pointer',
                  selectedLevel === 'comprehensive'
                    ? 'border-primary-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
                onClick={() => setSelectedLevel('comprehensive')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="scanLevel"
                    value="comprehensive"
                    checked={selectedLevel === 'comprehensive'}
                    onChange={() => setSelectedLevel('comprehensive')}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                    aria-label="Comprehensive Scan"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {comprehensiveConfig.name}
                        </h4>
                        <Badge variant="success" size="sm">
                          Recommended
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowComprehensiveDetails(!showComprehensiveDetails);
                        }}
                        className="text-xs"
                      >
                        {showComprehensiveDetails ? (
                          <>
                            Hide details <ChevronUp className="h-3 w-3 ml-1" />
                          </>
                        ) : (
                          <>
                            Show details <ChevronDown className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {comprehensiveConfig.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {comprehensiveConfig.estimatedTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {comprehensiveConfig.validators.length} validators
                      </span>
                    </div>

                    {/* Expandable details */}
                    {showComprehensiveDetails && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Includes all checks:
                        </p>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {comprehensiveConfig.checksIncluded.map((check, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{check}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custom option */}
              <div
                className={cn(
                  'border-2 rounded-lg p-3 transition-all cursor-pointer',
                  selectedLevel === 'custom'
                    ? 'border-primary-500 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
                onClick={() => setSelectedLevel('custom')}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="scanLevel"
                    value="custom"
                    checked={selectedLevel === 'custom'}
                    onChange={() => setSelectedLevel('custom')}
                    className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500"
                    aria-label="Custom Scan"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">Custom Scan</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCustomDetails(!showCustomDetails);
                        }}
                        className="text-xs"
                      >
                        {showCustomDetails ? (
                          <>
                            Hide details <ChevronUp className="h-3 w-3 ml-1" />
                          </>
                        ) : (
                          <>
                            Show details <ChevronDown className="h-3 w-3 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Select specific validators to run
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {customValidators.length} validators selected
                      </span>
                    </div>

                    {/* Expandable validator selection */}
                    {showCustomDetails && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Select validators:
                        </p>
                        <div className="space-y-2">
                          {allValidators.map((validator) => {
                            const meta = VALIDATOR_METADATA[validator];
                            const isSelected = customValidators.includes(validator);
                            return (
                              <label
                                key={validator}
                                className="flex items-start gap-2 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleValidator(validator)}
                                  className="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 rounded"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-900">
                                      {meta.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {meta.estimatedTime}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {meta.description}
                                  </p>
                                </div>
                              </label>
                            );
                          })}
                        </div>

                        {/* Matterhorn baseline info */}
                        <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 rounded-md p-3">
                          <p className="text-xs font-medium text-blue-900 mb-1">
                            ℹ️ About Matterhorn Protocol Checks
                          </p>
                          <p className="text-xs text-blue-800">
                            Matterhorn Protocol baseline checks (Document, Metadata, Language, etc.) always run automatically
                            using document properties. The validators you select above perform detailed scanning for specific
                            accessibility issues. Both results are combined in the final compliance summary.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="flex justify-end mt-4">
              <Button
                variant="primary"
                onClick={handleReScan}
                disabled={isScanning || (selectedLevel === 'custom' && customValidators.length === 0)}
              >
                {isScanning ? (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run {selectedLevel === 'comprehensive' ? 'Comprehensive' : 'Custom'} Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
