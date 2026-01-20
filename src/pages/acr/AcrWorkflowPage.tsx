import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, CriterionConfidence, createAcrAnalysis } from '@/services/api';
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
import type { AcrEdition } from '@/types/acr.types';

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

interface WorkflowState {
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
}

const STORAGE_KEY = 'acr-workflow-state';

function loadWorkflowState(jobId?: string): WorkflowState {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${jobId || 'new'}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load workflow state:', e);
  }
  return {
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
  };
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
  const navigate = useNavigate();
  
  const effectiveJobId = urlJobId || jobIdFromQuery;
  
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
  
  // Store actual File object for upload (not serializable to localStorage)
  const uploadedFileRef = useRef<File | null>(null);

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
                       'Untitled Document';
          setState(prev => ({ ...prev, fileName: name }));
        } catch (err: unknown) {
          if (controller.signal.aborted) return;
          if ((err as { name?: string })?.name === 'AbortError') return;
          setState(prev => ({ ...prev, fileName: 'Untitled Document' }));
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
        console.log('[ACR] Fetched jobs response:', JSON.stringify(jobs?.slice?.(0, 3) || jobs));
        const jobsWithAudit = Array.isArray(jobs) 
          ? jobs.filter((job: AuditJob) => {
              // Check for either 'score' (EPUB audit) or 'accessibilityScore'
              const output = job.output;
              const hasScore = output?.score !== undefined || output?.accessibilityScore !== undefined;
              return hasScore;
            })
          : [];
        console.log('[ACR] Filtered jobs with audit:', jobsWithAudit.length);
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
        
        if (fileToUpload) {
          // New file upload flow - use combined endpoint
          console.log('[ACR Workflow] Uploading file and creating ACR:', fileToUpload.name);
          setIsUploading(true);
          
          try {
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('edition', state.selectedEdition.code);
            formData.append('documentTitle', state.fileName || documentTitle || 'Untitled Document');
            
            // Let axios set Content-Type header with correct multipart boundary automatically
            const response = await api.post('/acr/analysis-with-upload', formData);
            
            console.log('[ACR Workflow] Upload response:', JSON.stringify(response.data));
            
            // Extract IDs and documentTitle from response
            const data = response.data?.data || response.data;
            const newJobId = data?.jobId;
            const newAcrId = data?.acrId || newJobId;
            const responseDocumentTitle = data?.documentTitle || data?.acrJob?.documentTitle;
            
            if (newJobId) {
              console.log('[ACR Workflow] Updating state with jobId:', newJobId, 'acrId:', newAcrId, 'documentTitle:', responseDocumentTitle);
              updateState({
                jobId: newJobId,
                acrId: newAcrId,
                // Update fileName from response if available (prevents unnecessary API call)
                ...(responseDocumentTitle && { fileName: responseDocumentTitle }),
              });
              // Also update the local documentTitle state
              if (responseDocumentTitle) {
                setDocumentTitle(responseDocumentTitle);
              }
              // Clear the file ref since it's been uploaded
              uploadedFileRef.current = null;
            } else {
              console.warn('[ACR Workflow] No jobId in response');
            }
          } catch (error: unknown) {
            console.error('[ACR Workflow] Failed to upload and create ACR:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setUploadError(errorMessage);
            // Do not advance workflow on failure - return early
            return;
          } finally {
            setIsUploading(false);
          }
        } else if (state.jobId && !state.jobId.startsWith('upload-')) {
          // Existing job flow - use original endpoint
          console.log('[ACR Workflow] Creating ACR for existing job:', state.jobId);
          try {
            const response = await createAcrAnalysis({
              jobId: state.jobId,
              edition: state.selectedEdition.code,
              documentTitle: state.fileName || documentTitle || 'Untitled Document'
            });
            console.log('[ACR Workflow] ACR created, response:', JSON.stringify(response));
            
            const newJobId = response?.data?.jobId || response?.jobId;
            const newAcrId = response?.data?.acrId || response?.acrId || newJobId;
            
            if (newJobId) {
              updateState({
                jobId: newJobId,
                acrId: newAcrId,
              });
            }
          } catch (error) {
            console.error('[ACR Workflow] Failed to create ACR:', error);
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

  const handleRestore = (version: number) => {
    console.log('Restoring to version:', version);
  };

  const handleResetWorkflow = () => {
    localStorage.removeItem(`${STORAGE_KEY}-${state.jobId || 'new'}`);
    setState({
      currentStep: 1,
      selectedEdition: null,
      documentSource: null,
      uploadedFile: null,
      jobId: null,
      acrId: null,
      verificationComplete: false,
      isFinalized: false,
      verifications: {},
      fileName: null,
    });
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
    
    console.log('[ACR] Selecting job:', jobId, 'fileName:', jobFileName);
    
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
        return state.jobId !== null;
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
            <EditionSelector
              selectedEdition={state.selectedEdition}
              onSelect={handleEditionSelect}
            />
            {state.selectedEdition && (
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
              {state.fileName && state.fileName !== 'Untitled Document' ? state.fileName : documentTitle}
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
        acrId={state.acrId || 'demo'}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}

export default AcrWorkflowPage;
