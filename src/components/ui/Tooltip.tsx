import React, { useState } from 'react';

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

export function Tooltip({ content, children, id, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <div aria-describedby={isVisible ? id : undefined}>
        {children}
      </div>
      {isVisible && (
        <div
          id={id}
          role="tooltip"
          className={`absolute z-10 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap ${POSITION_CLASSES[position]}`}
        >
          {content}
          <div className={`absolute border-4 border-transparent ${ARROW_CLASSES[position]}`} />
        </div>
      )}
    </div>
  );
}
