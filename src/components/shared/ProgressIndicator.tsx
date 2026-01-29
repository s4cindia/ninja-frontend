import React from 'react';
import { clsx } from 'clsx';
import { Check, X, Loader2 } from 'lucide-react';

export type ProgressVariant = 'linear' | 'circular' | 'steps';
export type ProgressStatus = 'idle' | 'active' | 'success' | 'error' | 'warning';

export interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  status: ProgressStatus;
}

export interface ProgressIndicatorProps {
  value?: number;
  variant?: ProgressVariant;
  status?: ProgressStatus;
  label?: string;
  description?: string;
  steps?: ProgressStep[];
  currentStep?: number;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  indeterminate?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value = 0,
  variant = 'linear',
  status = 'active',
  label,
  description,
  steps,
  currentStep = 0,
  showPercentage = true,
  size = 'md',
  className = '',
  indeterminate = false,
}) => {
  const sizes = {
    sm: { bar: 'h-1', circle: 64, text: 'text-xs', stepIcon: 'w-6 h-6' },
    md: { bar: 'h-2', circle: 96, text: 'text-sm', stepIcon: 'w-8 h-8' },
    lg: { bar: 'h-3', circle: 128, text: 'text-base', stepIcon: 'w-10 h-10' },
  };

  const statusColors = {
    idle: { bg: 'bg-gray-200', fill: 'bg-blue-500', stroke: 'stroke-gray-400', strokeFill: 'stroke-gray-400', text: 'text-gray-500' },
    active: { bg: 'bg-blue-100', fill: 'bg-blue-500', stroke: 'stroke-blue-100', strokeFill: 'stroke-blue-500', text: 'text-blue-600' },
    success: { bg: 'bg-green-100', fill: 'bg-green-500', stroke: 'stroke-green-100', strokeFill: 'stroke-green-500', text: 'text-green-600' },
    error: { bg: 'bg-red-100', fill: 'bg-red-500', stroke: 'stroke-red-100', strokeFill: 'stroke-red-500', text: 'text-red-600' },
    warning: { bg: 'bg-yellow-100', fill: 'bg-yellow-500', stroke: 'stroke-yellow-100', strokeFill: 'stroke-yellow-500', text: 'text-yellow-600' },
  };

  const sizeConfig = sizes[size];
  const colorConfig = statusColors[status];

  const LinearProgress = () => (
    <div className="w-full" role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1">
          {label && <span className={clsx(sizeConfig.text, 'font-medium text-gray-700')}>{label}</span>}
          {showPercentage && !indeterminate && (
            <span className={clsx(sizeConfig.text, colorConfig.text)}>{Math.round(value)}%</span>
          )}
        </div>
      )}
      
      <div className={clsx('w-full rounded-full overflow-hidden', colorConfig.bg, sizeConfig.bar)}>
        {indeterminate ? (
          <div 
            className={clsx(sizeConfig.bar, colorConfig.fill, 'rounded-full animate-indeterminate')}
            style={{ width: '30%' }}
          />
        ) : (
          <div
            className={clsx(sizeConfig.bar, colorConfig.fill, 'rounded-full transition-all duration-300')}
            style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          />
        )}
      </div>
      
      {description && (
        <p className={clsx('mt-1 text-gray-500', sizeConfig.text)}>{description}</p>
      )}
    </div>
  );

  const CircularProgress = () => {
    const circleSize = sizeConfig.circle;
    const strokeWidth = size === 'sm' ? 4 : size === 'md' ? 6 : 8;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (value / 100) * circumference;

    return (
      <div className="flex flex-col items-center" role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        <div className="relative" style={{ width: circleSize, height: circleSize }}>
          <svg className="transform -rotate-90" width={circleSize} height={circleSize}>
            <circle
              className={colorConfig.stroke}
              strokeWidth={strokeWidth}
              fill="transparent"
              r={radius}
              cx={circleSize / 2}
              cy={circleSize / 2}
            />
            <circle
              className={clsx(colorConfig.strokeFill, 'transition-all duration-300')}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="transparent"
              r={radius}
              cx={circleSize / 2}
              cy={circleSize / 2}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: indeterminate ? circumference * 0.75 : offset,
              }}
            />
          </svg>
          
          {showPercentage && !indeterminate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={clsx(sizeConfig.text, 'font-semibold', colorConfig.text)}>
                {Math.round(value)}%
              </span>
            </div>
          )}
          
          {indeterminate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" aria-hidden="true" />
            </div>
          )}
        </div>
        
        {label && (
          <span className={clsx('mt-2 font-medium text-gray-700', sizeConfig.text)}>{label}</span>
        )}
        {description && (
          <span className={clsx('text-gray-500', sizeConfig.text)}>{description}</span>
        )}
      </div>
    );
  };

  const StepsProgress = () => {
    const displaySteps = steps || [];
    
    return (
      <div className="w-full" role="list" aria-label={label || 'Progress steps'}>
        {label && (
          <h3 className={clsx(sizeConfig.text, 'font-medium text-gray-700 mb-4')}>{label}</h3>
        )}
        
        <div className="relative">
          {displaySteps.map((step, index) => {
            const isCompleted = step.status === 'success';
            const isActive = index === currentStep || step.status === 'active';
            const isError = step.status === 'error';
            
            return (
              <div key={step.id} className="flex items-start mb-4 last:mb-0" role="listitem">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={clsx(
                      sizeConfig.stepIcon,
                      'rounded-full flex items-center justify-center font-medium',
                      sizeConfig.text,
                      isCompleted && 'bg-green-500 text-white',
                      isActive && !isCompleted && 'bg-blue-500 text-white',
                      isError && 'bg-red-500 text-white',
                      !isCompleted && !isActive && !isError && 'bg-gray-200 text-gray-500'
                    )}
                    aria-label={isCompleted ? 'Completed' : isError ? 'Error' : isActive ? 'In progress' : 'Pending'}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : isError ? <X className="w-4 h-4" /> : index + 1}
                  </div>
                  
                  {index < displaySteps.length - 1 && (
                    <div
                      className={clsx(
                        'w-0.5 h-8 mt-2',
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      )}
                      aria-hidden="true"
                    />
                  )}
                </div>
                
                <div className="flex-1 pt-1">
                  <p className={clsx(sizeConfig.text, 'font-medium', isActive ? 'text-gray-900' : 'text-gray-600')}>
                    {step.label}
                  </p>
                  {step.description && (
                    <p className={clsx(sizeConfig.text, 'text-gray-500 mt-0.5')}>
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {description && (
          <p className={clsx('mt-4 text-gray-500', sizeConfig.text)}>{description}</p>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {variant === 'linear' && <LinearProgress />}
      {variant === 'circular' && <CircularProgress />}
      {variant === 'steps' && <StepsProgress />}
    </div>
  );
};
