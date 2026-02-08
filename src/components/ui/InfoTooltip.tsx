import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

/**
 * Enhanced tooltip component with:
 * - Auto-positioning based on available viewport space
 * - Support for rich content (ReactNode)
 * - Hover on desktop, click on mobile
 * - Portal rendering for proper z-index layering
 */
export function InfoTooltip({ content, children, className = '', maxWidth = '320px' }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [placement, setPlacement] = useState<'top' | 'bottom' | 'left' | 'right'>('top');
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current.offsetWidth;
    const tooltipHeight = tooltipRef.current.offsetHeight;
    const spacing = 8;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space in each direction
    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    let newPlacement: 'top' | 'bottom' | 'left' | 'right' = 'top';
    let top = 0;
    let left = 0;

    // Determine best placement based on available space
    if (spaceAbove >= tooltipHeight + spacing) {
      // Place above
      newPlacement = 'top';
      top = triggerRect.top - tooltipHeight - spacing;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (spaceBelow >= tooltipHeight + spacing) {
      // Place below
      newPlacement = 'bottom';
      top = triggerRect.bottom + spacing;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    } else if (spaceRight >= tooltipWidth + spacing) {
      // Place right
      newPlacement = 'right';
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.right + spacing;
    } else if (spaceLeft >= tooltipWidth + spacing) {
      // Place left
      newPlacement = 'left';
      top = triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2;
      left = triggerRect.left - tooltipWidth - spacing;
    } else {
      // Default to below if no space
      newPlacement = 'bottom';
      top = triggerRect.bottom + spacing;
      left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    }

    // Adjust horizontal position to stay within viewport
    if (left < spacing) {
      left = spacing;
    } else if (left + tooltipWidth > viewportWidth - spacing) {
      left = viewportWidth - tooltipWidth - spacing;
    }

    // Adjust vertical position to stay within viewport
    if (top < spacing) {
      top = spacing;
    } else if (top + tooltipHeight > viewportHeight - spacing) {
      top = viewportHeight - tooltipHeight - spacing;
    }

    setPlacement(newPlacement);
    setPosition({ top, left });
  };

  const show = () => {
    setIsVisible(true);
    // Calculate position after a brief delay to ensure tooltip is rendered
    setTimeout(calculatePosition, 10);
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  const cancelHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVisible) {
      hide();
    } else {
      show();
    }
  };

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isVisible &&
        triggerRef.current &&
        tooltipRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('click', handleClickOutside);
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible]);

  // Recalculate position when visibility changes
  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipElement = isVisible ? (
    <div
      ref={tooltipRef}
      className={`fixed z-50 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg transition-opacity ${className}`}
      style={{
        top: position ? `${position.top}px` : '-9999px',
        left: position ? `${position.left}px` : '-9999px',
        maxWidth,
        opacity: position ? 1 : 0,
      }}
      onMouseEnter={cancelHide}
      onMouseLeave={hide}
      role="tooltip"
    >
      {/* Arrow */}
      {position && (
        <div
          className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
            placement === 'top'
              ? 'bottom-[-4px] left-1/2 -translate-x-1/2'
              : placement === 'bottom'
              ? 'top-[-4px] left-1/2 -translate-x-1/2'
              : placement === 'left'
              ? 'right-[-4px] top-1/2 -translate-y-1/2'
              : 'left-[-4px] top-1/2 -translate-y-1/2'
          }`}
        />
      )}
      {content}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center cursor-help"
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={handleClick}
      >
        {children}
      </div>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </>
  );
}
