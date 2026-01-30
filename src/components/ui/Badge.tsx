import { HTMLAttributes, ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

type BadgeBaseProps = {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  as?: 'span' | 'button';
};

type BadgeAsSpanProps = BadgeBaseProps & {
  as?: 'span';
} & HTMLAttributes<HTMLSpanElement>;

type BadgeAsButtonProps = BadgeBaseProps & {
  as: 'button';
} & ButtonHTMLAttributes<HTMLButtonElement>;

type BadgeProps = BadgeAsSpanProps | BadgeAsButtonProps;

export function Badge(props: BadgeAsSpanProps): JSX.Element;
export function Badge(props: BadgeAsButtonProps): JSX.Element;
export function Badge({ 
  className, 
  variant = 'default', 
  size = 'md',
  as = 'span',
  children, 
  ...props 
}: BadgeProps): JSX.Element {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
  };

  const baseClasses = clsx(
    'inline-flex items-center font-medium rounded-full',
    variants[variant],
    sizes[size],
    as === 'button' && 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500',
    className
  );

  if (as === 'button') {
    return (
      <button
        type="button"
        className={baseClasses}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={baseClasses}
      {...(props as HTMLAttributes<HTMLSpanElement>)}
    >
      {children}
    </span>
  );
}
