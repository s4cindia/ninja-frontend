import React, { createContext, useContext, useState, KeyboardEvent, useId } from 'react';
import { clsx } from 'clsx';

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  tabsId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ 
  defaultValue, 
  value, 
  onValueChange, 
  children, 
  className 
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const activeTab = value ?? internalValue;
  const tabsId = useId();
  
  const setActiveTab = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, tabsId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div 
      className={clsx(
        'inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;
  const tabId = `${context.tabsId}-tab-${value}`;
  const panelId = `${context.tabsId}-panel-${value}`;

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const tablist = e.currentTarget.parentElement;
    if (!tablist) return;
    
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]:not([disabled])')) as HTMLButtonElement[];
    const currentIndex = tabs.indexOf(e.currentTarget);
    
    let nextIndex: number | null = null;
    
    switch (e.key) {
      case 'ArrowLeft':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case 'ArrowRight':
        nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = tabs.length - 1;
        break;
    }
    
    if (nextIndex !== null) {
      e.preventDefault();
      tabs[nextIndex].focus();
      tabs[nextIndex].click();
    }
  };

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => context.setActiveTab(value)}
      onKeyDown={handleKeyDown}
      className={clsx(
        'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
        isActive 
          ? 'bg-white text-gray-900 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.activeTab !== value) return null;

  const tabId = `${context.tabsId}-tab-${value}`;
  const panelId = `${context.tabsId}-panel-${value}`;

  return (
    <div 
      role="tabpanel" 
      id={panelId}
      aria-labelledby={tabId}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}
