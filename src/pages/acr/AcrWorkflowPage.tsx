import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { api, CriterionConfidence, createAcrAnalysis } from '@/services/api';
import { EDITION_CODE_MAP } from '@/services/acr.service';
import { 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Upload,
  Brain,
  UserCheck,
  Edit3,
  Download,
  Loader2,
  X,
  File,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EditionSelector } from '@/components/acr/EditionSelector';
import { ConfidenceDashboard } from '@/components/acr/ConfidenceDashboard';
import { VerificationQueue } from '@/components/acr/VerificationQueue';
import { AcrEditor } from '@/components/acr/AcrEditor';
import { ExportDialog } from '@/components/acr/ExportDialog';
import { VersionHistory } from '@/components/acr/VersionHistory';
import { useEditions } from '@/hooks/useAcr';
import type { AcrEdition, AcrEditionCode } from '@/types/acr.types';

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  icon: typeof FileText;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, name: 'Edition Selection', description: 'Choose VPAT edition', icon: FileText },
  { id: 2, name: 'Document Upload', description: 'Upload or select job', icon: Upload },
  { id: 3, name: 'AI Analysis', description: 'Review automated results', icon: Brain },
  { id: 4, name: 'Human Verification', description: 'Verify flagged criteria', icon: UserCheck },
  { id: 5, name: 'Review & Edit', description: 'Edit and finalize', icon: Edit3 },
  { id: 6, name: 'Export', description: 'Download ACR', icon: Download },
];

const UNTITLED_DOCUMENT = 'Untitled Document';

/**
 * Gets the display file name, preferring the actual file name over fallbacks.
 */
function getDisplayFileName(fileName?: string | null, documentTitle?: string): string {
  if (fileName && fileName !== UNTITLED_DOCUMENT) {
    return fileName;
  }
  return documentTitle || UNTITLED_DOCUMENT;
}

type DocumentSource = 'upload' | 'existing' | null;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface VerificationData {
  [itemId: string]: {
    status: string;
    method: string;
    notes: string;
    verifiedAt: string;
  };
}

/**
 * Workflow state for ACR generation process.
 * 
 * URL-SAFE FIELDS (passed in query params):
 * - edition, productName, vendor: Non-sensitive identifiers that can appear in URLs
 * 
 * SENSITIVE FIELDS (passed in navigation state only):
 * - contactEmail: PII that should not be logged in browser history or server logs
 */
interface WorkflowState {
  version: number;  // State schema version for migrations
  currentStep: number;
  selectedEdition: AcrEdition | null;
  documentSource: DocumentSource;
  uploadedFile: UploadedFile | null;
  jobId: string | null;
  acrId: string | null;
  verificationComplete: boolean;
  isFinalized: boolean;
  verifications: VerificationData;
  fileName: string | null;
  vendor: string | null;
  contactEmail: string | null;
  editionPreFilled: boolean;
}

const STORAGE_KEY = 'acr-workflow-state';
const STATE_VERSION = 1;

function getDefaultState(jobId?: string): WorkflowState {
  return {
    version: STATE_VERSION,
    currentStep: 1,
    selectedEdition: null,
    documentSource: null,
    uploadedFile: null,
    jobId: jobId || null,
    acrId: jobId ? `acr-${jobId}` : null,
    verificationComplete: false,
    isFinalized: false,
    verifications: {},
    fileName: null,
    vendor: null,
    contactEmail: null,
    editionPreFilled: false,
  };
}

function loadWorkflowState(jobId?: string): WorkflowState {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${jobId || 'new'}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate state version and migrate if needed
      if (typeof parsed === 'object' && parsed !== null) {
        // If version is missing or outdated, use default state with preserved compatible fields
        if (!parsed.version || parsed.version < STATE_VERSION) {
          const defaultState = getDefaultState(jobId);
          // Validate verifications is an object (not array) with string keys
          const isValidVerifications = parsed.verifications 
            && typeof parsed.verifications === 'object' 
            && !Array.isArray(parsed.verifications);
          return {
            ...defaultState,
            // Preserve compatible fields from old state
            currentStep: typeof parsed.currentStep === 'number' ? parsed.currentStep : defaultState.currentStep,
            selectedEdition: parsed.selectedEdition ?? defaultState.selectedEdition,
            verificationComplete: typeof parsed.verificationComplete === 'boolean' ? parsed.verificationComplete : defaultState.verificationComplete,
            verifications: isValidVerifications ? parsed.verifications : defaultState.verifications,
            fileName: parsed.fileName ?? defaultState.fileName,
            vendor: parsed.vendor ?? defaultState.vendor,
            contactEmail: parsed.contactEmail ?? defaultState.contactEmail,
          };
        }
        return parsed as WorkflowState;
      }
    }
  } catch (e) {
    console.error('Failed to load workflow state:', e);
  }
  return getDefaultState(jobId);
}

function saveWorkflowState(state: WorkflowState) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${state.jobId || 'new'}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save workflow state:', e);
  }
}

function StepIndicator({ 
  step, 
  currentStep, 
  isComplete,
  onClick 
}: { 
  step: WorkflowStep; 
  currentStep: number;
  isComplete: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  const isCurrent = step.id === currentStep;
  const isPast = step.id < currentStep || isComplete;
  const canClick = isPast || step.id <= currentStep;

  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={cn(
        'flex flex-col items-center gap-2 transition-colors',
        canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isCurrent && 'bg-primary-600 text-white',
          isPast && !isCurrent && 'bg-green-500 text-white',
          !isCurrent && !isPast && 'bg-gray-200 text-gray-500'
        )}
      >
        {isPast && !isCurrent ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="text-center">
        <div className={cn(
          'text-xs font-medium',
          isCurrent ? 'text-primary-600' : isPast ? 'text-green-600' : 'text-gray-500'
        )}>
          {step.name}
        </div>
      </div>
    </button>
  );
}

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  
  return (
    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

interface AuditJob {
  id: string;
  input?: { fileName?: string };
  output?: {
    fileName?: string;
    accessibilityScore?: number;
    score?: number;  // EPUB audit uses 'score'
  };
  createdAt: string;
}

export function AcrWorkflowPage() {
  const { jobId: urlJobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const jobIdFromQuery = searchParams.get('jobId');
  const fileNameFromQuery = searchParams.get('fileName');
  const editionFromQuery = searchParams.get('edition');
  const productNameFromQuery = searchParams.get('productName');
  const vendorFromQuery = searchParams.get('vendor');
  // Read contactEmail from navigation state (not URL for security)
  const location = useLocation();
  const locationState = location.state as { contactEmail?: string } | null;
  const contactEmailFromState = locationState?.contactEmail ?? null;
  const acrIdFromQuery = searchParams.get('acrId');
  const acrWorkflowIdFromQuery = searchParams.get('acrWorkflowId');
  const verificationCompleteFromQuery = searchParams.get('verificationComplete') === 'true';
  const navigate = useNavigate();
  
  const effectiveJobId = urlJobId || acrWorkflowIdFromQuery || jobIdFromQuery;
  
  const [state, setState] = useState<WorkflowState>(() => loadWorkflowState(effectiveJobId ?? undefined));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isLoading] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<AuditJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<CriterionConfidence[]>([]);
  const [documentTitle, setDocumentTitle] = useState<string>('Untitled Document');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preFilledValuesApplied, setPreFilledValuesApplied] = useState(false);
  
  // Store actual File object for upload (not serializable to localStorage)
  const uploadedFileRef = useRef<File | null>(null);
  
  // Fetch available editions to match pre-filled edition code
  const { data: editions } = useEditions();

  // Reset preFilledValuesApplied when query params or job ID change
  useEffect(() => {
    setPreFilledValuesApplied(false);
  }, [effectiveJobId, editionFromQuery, productNameFromQuery, vendorFromQuery, contactEmailFromState]);

  const handleCriteriaLoaded = useCallback((criteria: CriterionConfidence[]) => {
    setAnalysisResults(criteria);
  }, []);

  // Track the last applied URL job to detect navigation between jobs
  const lastAppliedJobRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Apply URL job when it changes (initial mount or navigation between jobs)
    if (effectiveJobId && effectiveJobId !== lastAppliedJobRef.current) {
      lastAppliedJobRef.current = effectiveJobId;
      const loadedState = loadWorkflowState(effectiveJobId);
      setState({
        ...loadedState,
        documentSource: 'existing',
        jobId: effectiveJobId,
        acrId: `acr-${effectiveJobId}`,
        fileName: fileNameFromQuery ? decodeURIComponent(fileNameFromQuery) : loadedState.fileName,
      });
    }
  }, [effectiveJobId, fileNameFromQuery]);

  useEffect(() => {
    if (fileNameFromQuery) {
      const decodedFileName = decodeURIComponent(fileNameFromQuery);
      setState(prev => {
        if (decodedFileName !== prev.fileName) {
          return { ...prev, fileName: decodedFileName };
        }
        return prev;
      });
    }
  }, [fileNameFromQuery]);

  useEffect(() => {
    const controller = new AbortController();
    
    const fetchFileName = async () => {
      if (state.jobId && !state.fileName) {
        try {
          const response = await api.get(`/epub/job/${state.jobId}`, { signal: controller.signal });
          if (controller.signal.aborted) return;
          const jobData = response.data?.data || response.data;
          const name = jobData.input?.fileName ||
                       jobData.output?.fileName ||
                       jobData.fileName ||
                       UNTITLED_DOCUMENT;
          setState(prev => ({ ...prev, fileName: name }));
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          if ((err as { name?: string })?.name === 'AbortError') return;
          console.warn('[ACR] Failed to fetch file name:', err);
          setState(prev => ({ ...prev, fileName: UNTITLED_DOCUMENT }));
        }
      }
    };
    fetchFileName();
    
    return () => {
      controller.abort();
    };
  }, [state.jobId, state.fileName]);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      setJobsError(null);
      try {
        const response = await api.get('/jobs');
        // Handle different response formats: { data: { jobs: [...] } } or { data: [...] }
        const responseData = response.data?.data;
        const jobs = responseData?.jobs || (Array.isArray(responseData) ? responseData : []);
        const jobsWithAudit = Array.isArray(jobs) 
          ? jobs.filter((job: AuditJob) => {
              // Type guard: ensure job is a valid object before accessing properties
              if (!job || typeof job !== 'object') return false;
              // Check for either 'score' (EPUB audit) or 'accessibilityScore'
              const output = job.output;
              const hasScore = output?.score !== undefined || output?.accessibilityScore !== undefined;
              return hasScore;
            })
          : [];
        setAvailableJobs(jobsWithAudit);
      } catch (error) {
        console.warn('[ACR] Failed to fetch jobs:', error);
        setJobsError('Unable to load existing jobs. You can still upload a new document.');
        setAvailableJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    // Skip API call if we already have a filename from the workflow state
    if (state.fileName) {
      setDocumentTitle(state.fileName);
      return;
    }

    const fetchJobTitle = async () => {
      if (!state.jobId) {
        setDocumentTitle('Untitled Document');
        return;
      }

      try {
        const response = await api.get(`/epub/job/${state.jobId}`);
        const job = response.data.data || response.data;

        // Try multiple possible locations for the filename
        const title = job.originalFile?.name ||
                      job.file?.name ||
                      job.input?.fileName ||
                      job.output?.fileName ||
                      job.output?.epubTitle ||
                      'Untitled Document';

        setDocumentTitle(title);
      } catch (error) {
        console.error('Failed to fetch job title:', error);
        setDocumentTitle('Untitled Document');
      }
    };

    fetchJobTitle();
  }, [state.jobId, state.fileName]);

  useEffect(() => {
    if (state.jobId) {
      saveWorkflowState(state);
    }
  }, [state]);

  // Apply pre-filled values from URL query parameters (highest priority)
  useEffect(() => {
    // Skip if already applied
    if (preFilledValuesApplied) {
      return;
    }
    
    // Check if we have query params to apply
    const hasQueryParams = editionFromQuery || productNameFromQuery || vendorFromQuery || contactEmailFromState;
    
    if (hasQueryParams) {
      // If we have an edition query param but editions aren't loaded yet, wait for them
      if (editionFromQuery && (!editions || editions.length === 0)) {
        // Don't mark as applied yet - wait for editions to load
        return;
      }
      
      const updates: Partial<WorkflowState> = {};
      let shouldSkipEditionStep = false;
      
      // Pre-fill edition from query param - editions are now loaded
      if (editionFromQuery && editions?.length) {
        // Map VPAT codes to API edition codes for matching using shared constant
        const normalizedCode = EDITION_CODE_MAP[editionFromQuery] || editionFromQuery.toLowerCase();
        const matchedEdition = editions.find(e => 
          e.code === editionFromQuery || 
          e.code === normalizedCode ||
          e.code.toLowerCase() === normalizedCode
        );
        if (matchedEdition) {
          updates.selectedEdition = matchedEdition;
          updates.editionPreFilled = true;
          shouldSkipEditionStep = true;
        }
      }
      
      // Pre-fill productName as fileName - always override if provided in query
      if (productNameFromQuery) {
        updates.fileName = productNameFromQuery;
        setDocumentTitle(productNameFromQuery);
      }
      
      // Pre-fill vendor - always override if provided in query
      if (vendorFromQuery) {
        updates.vendor = vendorFromQuery;
      }
      
      // Pre-fill contactEmail - always override if provided in navigation state
      if (contactEmailFromState) {
        updates.contactEmail = contactEmailFromState;
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        setState(prev => {
          const newState = { ...prev, ...updates };
          // Auto-advance to step 2 if edition was pre-filled and we're on step 1
          if (shouldSkipEditionStep && prev.currentStep === 1) {
            newState.currentStep = 2;
          }
          return newState;
        });
      }
      
      setPreFilledValuesApplied(true);
      return;
    }
    
    // If no query params, try fetching from API (only if we have a job ID)
    if (!effectiveJobId) {
      setPreFilledValuesApplied(true);
      return;
    }
    
    // Wait for editions to be loaded before attempting to match
    if (!editions || editions.length === 0) {
      // Don't mark as applied yet - wait for editions to load
      return;
    }
    
    const controller = new AbortController();
    
    const fetchPreFilledValues = async () => {
      try {
        // Try fetching from ACR job endpoint first, then fall back to EPUB job
        let jobData = null;
        
        try {
          const acrResponse = await api.get(`/acr/job/${effectiveJobId}`, { signal: controller.signal });
          jobData = acrResponse.data?.data || acrResponse.data;
        } catch {
          // ACR endpoint may not exist, try EPUB job endpoint
          const epubResponse = await api.get(`/epub/job/${effectiveJobId}`, { signal: controller.signal });
          jobData = epubResponse.data?.data || epubResponse.data;
        }
        
        if (controller.signal.aborted || !jobData) return;
        
        const updates: Partial<WorkflowState> = {};
        let shouldSkipEditionStep = false;
        
        // Pre-fill edition if present - editions are now loaded
        // Normalize edition code same way as query path using EDITION_CODE_MAP
        const editionCode = jobData.edition as AcrEditionCode | undefined;
        if (editionCode && !state.selectedEdition) {
          const normalizedCode = EDITION_CODE_MAP[editionCode] || editionCode.toLowerCase();
          const matchedEdition = editions.find(e => 
            e.code === editionCode || 
            e.code === normalizedCode ||
            e.code.toLowerCase() === normalizedCode
          );
          if (matchedEdition) {
            updates.selectedEdition = matchedEdition;
            updates.editionPreFilled = true;
            shouldSkipEditionStep = true;
          }
        }
        
        // Pre-fill productName as fileName
        if (jobData.productName && !state.fileName) {
          updates.fileName = jobData.productName;
          setDocumentTitle(jobData.productName);
        }
        
        // Pre-fill vendor
        if (jobData.vendor && !state.vendor) {
          updates.vendor = jobData.vendor;
        }
        
        // Pre-fill contactEmail
        if (jobData.contactEmail && !state.contactEmail) {
          updates.contactEmail = jobData.contactEmail;
        }
        
        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          setState(prev => {
            const newState = { ...prev, ...updates };
            // Auto-advance to step 2 if edition was pre-filled and we're on step 1
            if (shouldSkipEditionStep && prev.currentStep === 1) {
              newState.currentStep = 2;
            }
            return newState;
          });
        }
        
        setPreFilledValuesApplied(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.warn('[ACR] Failed to fetch pre-filled values:', error);
        setPreFilledValuesApplied(true);
      }
    };
    
    fetchPreFilledValues();
    
    return () => {
      controller.abort();
    };
  }, [effectiveJobId, editions, preFilledValuesApplied, editionFromQuery, productNameFromQuery, vendorFromQuery, contactEmailFromState, state.selectedEdition, state.fileName, state.vendor, state.contactEmail, state.currentStep]);

  // Handle return from verification - go directly to Review & Edit step (step 5)
  useEffect(() => {
    if (verificationCompleteFromQuery && acrWorkflowIdFromQuery) {
      setState(prev => ({
        ...prev,
        currentStep: 5,
        verificationComplete: true,
        acrId: prev.acrId || acrWorkflowIdFromQuery,
        jobId: prev.jobId || acrWorkflowIdFromQuery,
      }));
    }
  }, [verificationCompleteFromQuery, acrWorkflowIdFromQuery]);

  const updateState = (updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= WORKFLOW_STEPS.length) {
      updateState({ currentStep: step });
    }
  };

  const handleNext = async () => {
    if (state.currentStep < WORKFLOW_STEPS.length) {
      // If moving from Step 3 (AI Analysis) to Step 4, upload file and create ACR document
      if (state.currentStep === 3 && state.selectedEdition) {
        const fileToUpload = uploadedFileRef.current;
        const isUploadFlow = state.jobId?.startsWith('upload-');
        
        // Guard: Upload flow requires a file
        if (isUploadFlow && !fileToUpload) {
          setUploadError('No file selected. Please upload a file to continue.');
          return;
        }
        
        if (fileToUpload) {
          // New file upload flow - use combined endpoint
          setIsUploading(true);
          
          try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('edition', state.selectedEdition.code);
            formData.append('documentTitle', state.fileName || documentTitle || 'Untitled Document');
            
            // Let axios set Content-Type header with correct multipart boundary automatically
            const response = await api.post('/acr/analysis-with-upload', formData);
            
            // Extract IDs and documentTitle from response (use ?? for proper nullish coalescing)
            const data = response.data?.data ?? response.data;
            const newJobId = data?.jobId;
            const newAcrId = data?.acrId ?? newJobId;
            const responseDocumentTitle = data?.documentTitle ?? data?.acrJob?.documentTitle;
            
            // Guard: Response must contain valid jobId
            if (!newJobId) {
              setUploadError('Upload failed: No job ID returned from server.');
              return;
            }
            
            updateState({
              jobId: newJobId,
              acrId: newAcrId,
              ...(responseDocumentTitle && { fileName: responseDocumentTitle }),
            });
            if (responseDocumentTitle) {
              setDocumentTitle(responseDocumentTitle);
            }
            // Clear the file ref since it's been uploaded
            uploadedFileRef.current = null;
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setUploadError(errorMessage);
            // Do not advance workflow on failure
            return;
          } finally {
            setIsUploading(false);
          }
        } else if (state.jobId && !isUploadFlow) {
          // Existing job flow - use original endpoint
          try {
            const response = await createAcrAnalysis({
              jobId: state.jobId,
              edition: state.selectedEdition.code,
              documentTitle: state.fileName || documentTitle || 'Untitled Document'
            });
            
            const newJobId = response?.data?.jobId || response?.jobId;
            const newAcrId = response?.data?.acrId || response?.acrId || newJobId;
            
            // Guard: Response must contain valid jobId
            if (!newJobId) {
              setUploadError('Failed to create ACR: No job ID returned from server.');
              return;
            }
            
            updateState({
              jobId: newJobId,
              acrId: newAcrId,
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            setUploadError(`Failed to create ACR: ${errorMessage}`);
            // Do not advance workflow on failure
            return;
          }
        }
      }

      goToStep(state.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  };

  const handleEditionSelect = (edition: AcrEdition) => {
    updateState({ selectedEdition: edition });
  };

  const handleVerificationComplete = () => {
    updateState({ verificationComplete: true });
  };

  const handleFinalize = () => {
    updateState({ isFinalized: true, currentStep: 6 });
  };

  const handleRestore = (_version: number) => {
    // TODO: Implement version restore functionality
  };

  const handleResetWorkflow = () => {
    localStorage.removeItem(`${STORAGE_KEY}-${state.jobId || 'new'}`);
    setState(getDefaultState());
  };

  const handleVerificationUpdate = (itemId: string, status: string, method: string, notes: string) => {
    updateState({
      verifications: {
        ...state.verifications,
        [itemId]: {
          status,
          method,
          notes,
          verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        },
      },
    });
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Store actual File object in ref for later upload
      uploadedFileRef.current = file;
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      const newJobId = `upload-${Date.now()}`;
      updateState({ 
        documentSource: 'upload',
        uploadedFile,
        jobId: newJobId,
        acrId: `acr-${newJobId}`,
        fileName: file.name,
      });
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      // Store actual File object in ref for later upload
      uploadedFileRef.current = file;
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      const newJobId = `upload-${Date.now()}`;
      updateState({ 
        documentSource: 'upload',
        uploadedFile,
        jobId: newJobId,
        acrId: `acr-${newJobId}`,
        fileName: file.name,
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleClearFile = () => {
    updateState({ 
      documentSource: null,
      uploadedFile: null,
      jobId: null,
      acrId: null,
    });
  };

  const handleSelectExistingJob = (jobId: string) => {
    // Find the job to get its display name
    const selectedJob = availableJobs.find(job => job.id === jobId);
    const jobFileName = selectedJob 
      ? (selectedJob.input?.fileName || selectedJob.output?.fileName || (selectedJob.output as { epubTitle?: string })?.epubTitle || 'Untitled Document')
      : null;
    
    
    updateState({ 
      documentSource: 'existing',
      uploadedFile: null,
      jobId, 
      acrId: `acr-${jobId}`,
      fileName: jobFileName,
    });
    
    // Also update local documentTitle state
    if (jobFileName) {
      setDocumentTitle(jobFileName);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return state.selectedEdition !== null;
      case 2:
        // Allow proceeding if a document is selected OR if pre-filled from batch flow
        return state.jobId !== null || (state.editionPreFilled && state.fileName !== null);
      case 3:
        return true;
      case 4:
        return state.verificationComplete;
      case 5:
        return state.isFinalized;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select VPAT Edition</h2>
              <p className="text-gray-600">
                Choose the accessibility standard edition for your ACR document.
              </p>
            </div>
            {state.editionPreFilled && state.selectedEdition && (
              <Alert variant="info">
                Edition pre-selected from batch configuration: <strong>{state.selectedEdition.name}</strong>. You can change it if needed.
              </Alert>
            )}
            <EditionSelector
              selectedEdition={state.selectedEdition}
              onSelect={handleEditionSelect}
            />
            {state.selectedEdition && !state.editionPreFilled && (
              <Alert variant="success">
                Selected: {state.selectedEdition.name}
              </Alert>
            )}
          </div>
        );

      case 2: {
        const getJobDisplayName = (job: AuditJob) => {
          return job.input?.fileName || job.output?.fileName || (job.output as { epubTitle?: string })?.epubTitle || 'Untitled Document';
        };

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Source</h2>
              <p className="text-gray-600">
                Upload a document or select an existing audited job.
              </p>
            </div>

            {state.fileName && state.editionPreFilled && (
              <Alert variant="success">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span>Batch/Product: <strong>{state.fileName}</strong></span>
                    {state.selectedEdition && (
                      <Badge variant="info">{state.selectedEdition.name}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-green-700 ml-6">
                    Pre-configured from batch. You can optionally select a specific document below, or click Next to continue.
                  </p>
                </div>
              </Alert>
            )}
            {state.fileName && !state.editionPreFilled && (
              <Alert variant="info">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Batch/Product: <strong>{state.fileName}</strong></span>
                  {state.selectedEdition && (
                    <Badge variant="info">{state.selectedEdition.name}</Badge>
                  )}
                </div>
              </Alert>
            )}

            {effectiveJobId && state.jobId === effectiveJobId && (
              <Alert variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Document pre-selected from EPUB Audit:
                  <Badge variant="info">{effectiveJobId.slice(0, 12)}...</Badge>
                </div>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={cn(
                'border rounded-lg p-6 transition-all',
                state.documentSource === 'upload' && 'ring-2 ring-primary-500 border-primary-500'
              )}>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-gray-500" />
                  Upload New Document
                </h3>

                {!state.uploadedFile ? (
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      'hover:border-primary-400 hover:bg-primary-50'
                    )}
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Supports EPUB, PDF, and HTML files
                    </p>
                    <label className="cursor-pointer inline-block">
                      <input
                        type="file"
                        className="hidden"
                        accept=".epub,.pdf,.html,.htm"
                        onChange={handleFileUpload}
                      />
                      <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                        Browse Files
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-primary-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <File className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate" title={state.uploadedFile.name}>
                            {state.uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">{formatFileSize(state.uploadedFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleClearFile} className="flex-shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn(
                'border rounded-lg p-6 transition-all',
                state.documentSource === 'existing' && 'ring-2 ring-primary-500 border-primary-500'
              )}>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  Select Audited Document
                </h3>

                {isLoadingJobs ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading available jobs...
                  </div>
                ) : jobsError ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-amber-600">{jobsError}</p>
                  </div>
                ) : availableJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-amber-600">
                      No audited documents found.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please audit a document first in EPUB Accessibility.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {availableJobs.map((job) => (
                      <div
                        key={job.id}
                        className={cn(
                          'p-3 cursor-pointer transition-colors',
                          'hover:bg-gray-50',
                          state.jobId === job.id && 'bg-primary-50'
                        )}
                        onClick={() => handleSelectExistingJob(job.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm truncate" title={getJobDisplayName(job)}>
                                {getJobDisplayName(job)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(job.createdAt).toLocaleString()}
                                {(job.output?.score !== undefined || job.output?.accessibilityScore !== undefined) && 
                                  ` - Score: ${job.output?.score ?? job.output?.accessibilityScore}%`}
                              </p>
                              <p className="text-xs text-gray-400 font-mono truncate" title={job.id}>
                                ID: {job.id.slice(0, 8)}...
                              </p>
                            </div>
                          </div>
                          {state.jobId === job.id && (
                            <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {state.jobId && !effectiveJobId && (
              <Alert variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {state.documentSource === 'upload' ? 'Document uploaded' : 'Job selected'}: 
                  <Badge variant="info">
                    {state.uploadedFile?.name || availableJobs.find(j => j.id === state.jobId)?.input?.fileName || state.jobId}
                  </Badge>
                </div>
              </Alert>
            )}
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis Results</h2>
              <p className="text-gray-600">
                Review the automated accessibility analysis and confidence scores.
              </p>
            </div>
            <ConfidenceDashboard 
              jobId={state.jobId || 'demo'} 
              onCriteriaLoaded={handleCriteriaLoaded}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Human Verification</h2>
              <p className="text-gray-600">
                Verify flagged criteria that require human review.
              </p>
            </div>
            <VerificationQueue 
              jobId={state.jobId || 'demo'} 
              onComplete={handleVerificationComplete}
              savedVerifications={state.verifications}
              onVerificationUpdate={handleVerificationUpdate}
              criteriaFromAnalysis={analysisResults}
            />
            {state.verificationComplete && (
              <Alert variant="success">
                All verification tasks completed. You can proceed to review.
              </Alert>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Review & Edit ACR</h2>
                <p className="text-gray-600">
                  Review all criteria, edit remarks, and finalize the document.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                {showVersionHistory ? 'Hide History' : 'Version History'}
              </Button>
            </div>
            
            {showVersionHistory ? (
              <div className="bg-white border rounded-lg p-4">
                <VersionHistory 
                  acrId={state.acrId || 'demo'} 
                  onRestore={handleRestore}
                />
              </div>
            ) : (
              <AcrEditor 
                jobId={state.jobId || 'demo'}
                documentTitle={state.fileName || documentTitle}
                onFinalized={handleFinalize}
              />
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Export ACR Document</h2>
              <p className="text-gray-600">
                Download your completed ACR in your preferred format.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => setIsExportOpen(true)}
              >
                <Download className="h-10 w-10 mx-auto text-primary-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Export Document</h3>
                <p className="text-sm text-gray-500">Word, PDF, or HTML format</p>
              </div>

              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => setShowVersionHistory(true)}
              >
                <FileText className="h-10 w-10 mx-auto text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Version History</h3>
                <p className="text-sm text-gray-500">View document history</p>
              </div>

              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => navigate('/dashboard')}
              >
                <CheckCircle className="h-10 w-10 mx-auto text-green-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Complete</h3>
                <p className="text-sm text-gray-500">Return to dashboard</p>
              </div>
            </div>

            {showVersionHistory && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowVersionHistory(false)}
                  >
                    Close History
                  </Button>
                </div>
                <VersionHistory 
                  acrId={state.acrId || 'demo'} 
                  onRestore={handleRestore}
                />
              </div>
            )}

            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Workflow Complete!</span>
                <span>Your ACR document is ready for export.</span>
              </div>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Breadcrumbs items={[{ label: 'ACR Workflow' }]} />
      
      {/* Upload Error Alert */}
      {uploadError && (
        <Alert variant="error" className="mb-4">
          <div className="flex items-center justify-between">
            <span>Upload failed: {uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="ml-4 text-red-700 hover:text-red-900"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}
      
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">ACR Generation Workflow</h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetWorkflow}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Start New
            </Button>
            <Badge variant="info">
              Step {state.currentStep} of {WORKFLOW_STEPS.length}
            </Badge>
          </div>
        </div>
        <p className="text-gray-600">
          Complete each step to generate your Accessibility Conformance Report.
        </p>
      </div>

      {/* Document Title Display */}
      {state.jobId && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">Title:</span>
            <span className="text-sm font-semibold text-gray-900">
              {getDisplayFileName(state.fileName, documentTitle)}
            </span>
          </div>
        </div>
      )}

      <div className="mb-8">
        <ProgressBar currentStep={state.currentStep} totalSteps={WORKFLOW_STEPS.length} />
      </div>

      <div className="mb-8 hidden md:flex justify-between items-start">
        {WORKFLOW_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <StepIndicator
              step={step}
              currentStep={state.currentStep}
              isComplete={step.id < state.currentStep}
              onClick={() => step.id <= state.currentStep && goToStep(step.id)}
            />
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 min-w-[40px]',
                step.id < state.currentStep ? 'bg-green-500' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden mb-6">
        <div className="flex items-center justify-center gap-2">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                step.id === state.currentStep && 'bg-primary-600',
                step.id < state.currentStep && 'bg-green-500',
                step.id > state.currentStep && 'bg-gray-300'
              )}
            />
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="font-medium text-gray-900">
            {WORKFLOW_STEPS[state.currentStep - 1].name}
          </span>
          <span className="text-gray-500 text-sm ml-2">
            ({WORKFLOW_STEPS[state.currentStep - 1].description})
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={state.currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {state.currentStep === WORKFLOW_STEPS.length ? (
            <Button onClick={() => navigate('/dashboard')}>
              Finish
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <ExportDialog
        acrId={acrIdFromQuery || state.acrId || 'demo'}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}

export default AcrWorkflowPage;
