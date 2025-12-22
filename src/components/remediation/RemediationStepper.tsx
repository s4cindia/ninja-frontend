import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

export type RemediationStep = 'audit' | 'plan' | 'remediate' | 'review' | 'export';

interface Step {
  id: RemediationStep;
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 'audit', label: 'Audit', description: 'Audit Complete' },
  { id: 'plan', label: 'Plan', description: 'Plan Created' },
  { id: 'remediate', label: 'Remediate', description: 'Run Fixes' },
  { id: 'review', label: 'Review', description: 'Review Changes' },
  { id: 'export', label: 'Export', description: 'Download' },
];

interface RemediationStepperProps {
  currentStep: RemediationStep;
  completedSteps: RemediationStep[];
  onStepClick?: (step: RemediationStep) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const RemediationStepper: React.FC<RemediationStepperProps> = ({
  currentStep,
  completedSteps,
  onStepClick,
  orientation = 'horizontal',
  className,
}) => {
  const getStepIndex = (step: RemediationStep) => STEPS.findIndex(s => s.id === step);
  const currentIndex = getStepIndex(currentStep);

  const isStepAccessible = (step: RemediationStep) => {
    return completedSteps.includes(step) || step === currentStep;
  };

  const getStepStatus = (step: RemediationStep): 'completed' | 'current' | 'upcoming' => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'upcoming';
  };

  const handleStepClick = (step: RemediationStep) => {
    if (onStepClick && isStepAccessible(step)) {
      onStepClick(step);
    }
  };

  if (orientation === 'vertical') {
    return (
      <nav className={clsx('flex flex-col gap-0', className)} aria-label="Remediation progress">
        {STEPS.map((step, index) => {
          const status = getStepStatus(step.id);
          const isAccessible = isStepAccessible(step.id);

          return (
            <div key={step.id} className="flex">
              <div className="flex flex-col items-center mr-4">
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isAccessible}
                  aria-current={status === 'current' ? 'step' : undefined}
                  className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                    status === 'completed' && 'bg-green-500 text-white',
                    status === 'current' && 'bg-primary-600 text-white ring-2 ring-primary-300',
                    status === 'upcoming' && 'bg-gray-200 text-gray-400',
                    isAccessible && status !== 'upcoming' ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      'w-0.5 h-12',
                      getStepIndex(step.id) < currentIndex || completedSteps.includes(step.id)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
              <div className="pb-12">
                <p
                  className={clsx(
                    'font-medium',
                    status === 'current' ? 'text-primary-600' : status === 'completed' ? 'text-gray-900' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-sm text-gray-500">{step.description}</p>
              </div>
            </div>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className={clsx('flex items-center justify-between', className)} aria-label="Remediation progress">
      {STEPS.map((step, index) => {
        const status = getStepStatus(step.id);
        const isAccessible = isStepAccessible(step.id);

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                disabled={!isAccessible}
                aria-current={status === 'current' ? 'step' : undefined}
                className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  status === 'completed' && 'bg-green-500 text-white',
                  status === 'current' && 'bg-primary-600 text-white ring-2 ring-primary-300',
                  status === 'upcoming' && 'bg-gray-200 text-gray-400',
                  isAccessible && status !== 'upcoming' ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'
                )}
              >
                {status === 'completed' ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </button>
              <p
                className={clsx(
                  'mt-2 text-xs font-medium text-center',
                  status === 'current' ? 'text-primary-600' : status === 'completed' ? 'text-gray-900' : 'text-gray-400'
                )}
              >
                {step.label}
              </p>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={clsx(
                  'flex-1 h-0.5 mx-2',
                  getStepIndex(step.id) < currentIndex || completedSteps.includes(step.id)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
