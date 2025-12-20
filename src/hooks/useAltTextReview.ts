import { useState, useEffect, useCallback } from 'react';
import { altTextService } from '@/services/alt-text.service';
import { GeneratedAltText, AltTextStatus, AltTextFlag } from '@/types/alt-text.types';

interface ReviewQueueStats {
  total: number;
  pending: number;
  needsReview: number;
  approved: number;
  edited: number;
  rejected: number;
}

interface ReviewFilters {
  status?: AltTextStatus;
  minConfidence?: number;
  maxConfidence?: number;
  flags?: string[];
}

const generateDemoItems = (): GeneratedAltText[] => [
  {
    id: 'alt-001',
    imageId: 'img-001',
    jobId: 'job-001',
    shortAlt: 'A colorful bar chart showing quarterly sales data with four bars representing Q1 through Q4',
    extendedAlt: 'Bar chart displaying company sales performance across four quarters. Q1 shows $12M, Q2 peaks at $19M, Q3 dips to $8M, and Q4 recovers to $15M.',
    confidence: 92,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailUrl: 'https://quickchart.io/chart?c={type:"bar",data:{labels:["Q1","Q2","Q3","Q4"],datasets:[{data:[12,19,8,15]}]}}',
  },
  {
    id: 'alt-002',
    imageId: 'img-002',
    jobId: 'job-001',
    shortAlt: 'Portrait photo of a person in business attire',
    extendedAlt: 'Professional headshot showing a person wearing a dark suit jacket and white shirt against a neutral gray background.',
    confidence: 68,
    flags: ['FACE_DETECTED', 'NEEDS_MANUAL_REVIEW'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    status: 'needs_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/person/200/200',
  },
  {
    id: 'alt-003',
    imageId: 'img-003',
    jobId: 'job-001',
    shortAlt: 'Flowchart diagram showing a multi-step approval process',
    extendedAlt: 'Process flowchart with six steps: Start, Submit Request, Manager Review (decision point), Approved path leads to Process Complete, Rejected path leads to Revise and resubmit.',
    confidence: 85,
    flags: ['DATA_VISUALIZATION', 'COMPLEX_IMAGE'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/flowchart/200/200',
  },
  {
    id: 'alt-004',
    imageId: 'img-004',
    jobId: 'job-001',
    shortAlt: 'Screenshot containing text that requires OCR extraction',
    extendedAlt: 'Screenshot of a document page with multiple paragraphs of text. The heading reads "Chapter 3: Implementation" followed by body text.',
    confidence: 45,
    flags: ['TEXT_IN_IMAGE', 'LOW_CONFIDENCE', 'NEEDS_MANUAL_REVIEW'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    status: 'needs_review',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailUrl: 'https://picsum.photos/seed/text/200/200',
  },
  {
    id: 'alt-005',
    imageId: 'img-005',
    jobId: 'job-001',
    shortAlt: 'Pie chart showing market share distribution among competitors',
    extendedAlt: 'Pie chart divided into five segments: Company A (35%, blue), Company B (25%, green), Company C (20%, orange), Company D (12%, purple), Others (8%, gray).',
    confidence: 88,
    flags: ['DATA_VISUALIZATION', 'DATA_EXTRACTED'] as AltTextFlag[],
    aiModel: 'gemini-1.5-pro',
    status: 'approved',
    approvedAlt: 'Pie chart showing market share distribution among competitors',
    approvedBy: 'user-001',
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    thumbnailUrl: 'https://quickchart.io/chart?c={type:"pie",data:{labels:["A","B","C","D","Other"],datasets:[{data:[35,25,20,12,8]}]}}',
  },
];

export function useAltTextReview(jobId: string) {
  const [items, setItems] = useState<GeneratedAltText[]>([]);
  const [stats, setStats] = useState<ReviewQueueStats>({
    total: 0,
    pending: 0,
    needsReview: 0,
    approved: 0,
    edited: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewFilters>({});
  const [isDemo, setIsDemo] = useState(false);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await altTextService.getReviewQueue(jobId, filters);
      setItems(data.items);
      setStats(data.stats);
      setIsDemo(false);
    } catch (err) {
      console.warn('Using demo data - backend unavailable');
      const demoItems = generateDemoItems();
      let filtered = demoItems;
      
      if (filters.status) {
        filtered = filtered.filter(item => item.status === filters.status);
      }
      if (filters.minConfidence !== undefined) {
        filtered = filtered.filter(item => item.confidence >= filters.minConfidence!);
      }
      if (filters.maxConfidence !== undefined) {
        filtered = filtered.filter(item => item.confidence <= filters.maxConfidence!);
      }
      
      setItems(filtered);
      setStats({
        total: demoItems.length,
        pending: demoItems.filter(i => i.status === 'pending').length,
        needsReview: demoItems.filter(i => i.status === 'needs_review').length,
        approved: demoItems.filter(i => i.status === 'approved').length,
        edited: demoItems.filter(i => i.status === 'edited').length,
        rejected: demoItems.filter(i => i.status === 'rejected').length,
      });
      setIsDemo(true);
    } finally {
      setIsLoading(false);
    }
  }, [jobId, filters]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const approve = async (id: string, approvedAlt?: string) => {
    try {
      if (isDemo) {
        setItems(prev => prev.map(item => 
          item.id === id 
            ? { ...item, status: 'approved' as AltTextStatus, approvedAlt: approvedAlt || item.shortAlt }
            : item
        ));
        return;
      }
      await altTextService.approve(id, approvedAlt);
      await loadQueue();
    } catch (err) {
      setError('Failed to approve');
      throw err;
    }
  };

  const reject = async (id: string, reason?: string) => {
    try {
      if (isDemo) {
        setItems(prev => prev.map(item => 
          item.id === id ? { ...item, status: 'rejected' as AltTextStatus } : item
        ));
        return;
      }
      await altTextService.reject(id, reason);
      await loadQueue();
    } catch (err) {
      setError('Failed to reject');
      throw err;
    }
  };

  const regenerate = async (id: string, additionalContext?: string) => {
    try {
      if (isDemo) {
        setItems(prev => prev.map(item => 
          item.id === id 
            ? { ...item, flags: [...item.flags, 'REGENERATED'] as AltTextFlag[], confidence: Math.min(item.confidence + 10, 95) }
            : item
        ));
        return;
      }
      await altTextService.regenerate(id, { additionalContext, useContextAware: true });
      await loadQueue();
    } catch (err) {
      setError('Failed to regenerate');
      throw err;
    }
  };

  const batchApprove = async (minConfidence: number = 85) => {
    try {
      if (isDemo) {
        const toApprove = items.filter(i => i.confidence >= minConfidence && i.status !== 'approved').length;
        setItems(prev => prev.map(item => 
          item.confidence >= minConfidence && item.status !== 'approved'
            ? { ...item, status: 'approved' as AltTextStatus }
            : item
        ));
        return { approved: toApprove };
      }
      const result = await altTextService.batchApprove(jobId, { minConfidence });
      await loadQueue();
      return result;
    } catch (err) {
      setError('Failed to batch approve');
      throw err;
    }
  };

  return {
    items,
    stats,
    isLoading,
    error,
    isDemo,
    filters,
    setFilters,
    refresh: loadQueue,
    approve,
    reject,
    regenerate,
    batchApprove,
  };
}
