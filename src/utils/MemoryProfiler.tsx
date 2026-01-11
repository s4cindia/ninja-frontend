import { useEffect, useRef } from 'react';

interface MemoryMetrics {
  timestamp: number;
  changeIndex: number;
  jsHeapSize: number;
  jsHeapSizeLimit: number;
  iframeCount: number;
  queryCount: number;
  eventListenerCount: number;
}

class MemoryMonitor {
  private metrics: MemoryMetrics[] = [];
  private maxMetrics = 20;

  logMetrics(changeIndex: number) {
    const memory = (performance as any).memory;

    const iframeCount = document.querySelectorAll('iframe').length;
    const queryCache = (window as any).__REACT_QUERY_DEVTOOLS_GLOBAL_HOOK__?.queryClient?.getQueryCache();
    const queryCount = queryCache?.getAll()?.length || 0;

    const metrics: MemoryMetrics = {
      timestamp: Date.now(),
      changeIndex,
      jsHeapSize: memory?.usedJSHeapSize || 0,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit || 0,
      iframeCount,
      queryCount,
      eventListenerCount: this.estimateEventListeners()
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    this.logToConsole(metrics);
    this.checkForLeaks();
  }

  private estimateEventListeners(): number {
    return document.querySelectorAll('[onclick], [onload], [onscroll]').length;
  }

  private logToConsole(metrics: MemoryMetrics) {
    const mbUsed = (metrics.jsHeapSize / 1024 / 1024).toFixed(2);
    const mbLimit = (metrics.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
    const usagePercent = ((metrics.jsHeapSize / metrics.jsHeapSizeLimit) * 100).toFixed(1);

    console.log(
      `%c[MEMORY] Change ${metrics.changeIndex}`,
      'background: #2196F3; color: white; padding: 2px 5px; border-radius: 3px;',
      `\n  Heap: ${mbUsed} MB / ${mbLimit} MB (${usagePercent}%)`,
      `\n  iframes: ${metrics.iframeCount}`,
      `\n  Queries: ${metrics.queryCount}`,
      `\n  Event Listeners: ~${metrics.eventListenerCount}`
    );
  }

  private checkForLeaks() {
    if (this.metrics.length < 3) return;

    const recent = this.metrics.slice(-3);
    const heapGrowth = recent.slice(1).map((m, i) =>
      m.jsHeapSize - recent[i].jsHeapSize
    );

    const avgGrowth = heapGrowth.length > 0 
      ? heapGrowth.reduce((a, b) => a + b, 0) / heapGrowth.length 
      : 0;

    if (avgGrowth > 5 * 1024 * 1024) {
      console.error(
        `%c[MEMORY LEAK DETECTED]`,
        'background: #f44336; color: white; padding: 5px; font-weight: bold;',
        `\n  Average growth: ${(avgGrowth / 1024 / 1024).toFixed(2)} MB per navigation`,
        `\n  Last 3 navigations:`,
        recent.map((m, i) => `\n    ${i + 1}. Change ${m.changeIndex}: ${(m.jsHeapSize / 1024 / 1024).toFixed(2)} MB`)
      );

      this.diagnoseLeakSource(recent);
    }
  }

  private diagnoseLeakSource(recent: MemoryMetrics[]) {
    const iframeGrowth = recent[recent.length - 1].iframeCount - recent[0].iframeCount;
    const queryGrowth = recent[recent.length - 1].queryCount - recent[0].queryCount;

    console.log(
      `%c[LEAK DIAGNOSIS]`,
      'background: #ff9800; color: white; padding: 3px 5px;',
      `\n  iframe growth: ${iframeGrowth} (should be 0)`,
      `\n  Query cache growth: ${queryGrowth} (should be <5)`,
      `\n  Likely culprit: ${iframeGrowth > 0 ? 'IFRAMES NOT CLEANED UP' : queryGrowth > 10 ? 'QUERY CACHE BLOAT' : 'OTHER'}`
    );
  }

  printSummary() {
    console.group('%c[MEMORY SUMMARY]', 'background: #4CAF50; color: white; padding: 5px; font-weight: bold;');
    console.table(this.metrics.map(m => ({
      Change: m.changeIndex,
      'Heap (MB)': (m.jsHeapSize / 1024 / 1024).toFixed(2),
      'iframes': m.iframeCount,
      'Queries': m.queryCount
    })));
    console.groupEnd();
  }
}

export const memoryMonitor = new MemoryMonitor();

export function useMemoryMonitor(changeIndex: number) {
  const lastLoggedIndex = useRef<number | null>(null);

  useEffect(() => {
    if (lastLoggedIndex.current !== changeIndex) {
      memoryMonitor.logMetrics(changeIndex);
      lastLoggedIndex.current = changeIndex;
    }
  }, [changeIndex]);
}
