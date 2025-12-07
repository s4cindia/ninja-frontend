import { HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  onClose?: () => void;
}

export function Alert({ 
  className, 
  variant = 'info', 
  title,
  onClose,
  children, 
  ...props 
}: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      text: 'text-blue-700',
    },
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'text-green-400',
      title: 'text-green-800',
      text: 'text-green-700',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      text: 'text-yellow-700',
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      text: 'text-red-700',
    },
  };

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle,
  };

  const Icon = icons[variant];
  const styles = variants[variant];

  return (
    <div
      className={clsx(
        'flex p-4 rounded-md border',
        styles.container,
        className
      )}
      role="alert"
      {...props}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0', styles.icon)} />
      <div className="ml-3 flex-1">
        {title && (
          <h3 className={clsx('text-sm font-medium', styles.title)}>
            {title}
          </h3>
        )}
        <div className={clsx('text-sm', styles.text, title && 'mt-1')}>
          {children}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className={clsx('ml-3 flex-shrink-0', styles.icon, 'hover:opacity-75')}
          aria-label="Close alert"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
