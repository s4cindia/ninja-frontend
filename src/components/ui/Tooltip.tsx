import React, { useState, useCallback, useEffect, isValidElement, cloneElement } from 'react';

export interface TooltipProps {
  content: string;
  children: React.ReactNode;
  id: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const POSITION_CLASSES = {
  top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
} as const;

const ARROW_CLASSES = {
  top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900',
  bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900',
  left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900',
  right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900',
} as const;

function mergeAriaDescribedBy(existing: string | undefined, newId: string | undefined): string | undefined {
  if (!newId) return existing;
  if (!existing) return newId;
  return `${existing} ${newId}`;
}

export function Tooltip({ content, children, id, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  }, []);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);

  const renderChild = () => {
    if (isValidElement(children)) {
      const childProps = children.props as Record<string, unknown>;
      const existingDescribedBy = childProps['aria-describedby'] as string | undefined;
      
      return cloneElement(children, {
        'aria-describedby': mergeAriaDescribedBy(existingDescribedBy, isVisible ? id : undefined),
        onMouseEnter: (e: React.MouseEvent) => {
          show();
          if (typeof childProps.onMouseEnter === 'function') {
            (childProps.onMouseEnter as (e: React.MouseEvent) => void)(e);
          }
        },
        onMouseLeave: (e: React.MouseEvent) => {
          hide();
          if (typeof childProps.onMouseLeave === 'function') {
            (childProps.onMouseLeave as (e: React.MouseEvent) => void)(e);
          }
        },
        onFocus: (e: React.FocusEvent) => {
          show();
          if (typeof childProps.onFocus === 'function') {
            (childProps.onFocus as (e: React.FocusEvent) => void)(e);
          }
        },
        onBlur: (e: React.FocusEvent) => {
          hide();
          if (typeof childProps.onBlur === 'function') {
            (childProps.onBlur as (e: React.FocusEvent) => void)(e);
          }
        },
      } as React.HTMLAttributes<HTMLElement>);
    }
    return children;
  };

  const isCloneable = isValidElement(children);

  return (
    <span
      className="relative inline-block"
      {...(!isCloneable && {
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })}
    >
      {renderChild()}
      {isVisible && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap ${POSITION_CLASSES[position]}`}
        >
          {content}
          <span className={`absolute border-4 border-transparent ${ARROW_CLASSES[position]}`} />
        </span>
      )}
    </span>
  );
}
