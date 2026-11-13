import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Checkbox } from '@/components/ui/Checkbox';
import { DocumentUploader } from '@/components/epub/EPUBUploader';
import { validateJobId } from '@/utils/validation';
import { useAuthStore } from '@/stores/auth.store';
import { useTeamExecutives } from '@/hooks/useTeamExecutives';
import type { TeamExecutive } from '@/services/team.service';
import type { AuditSummary } from '@/types/audit.types';

export const PdfAccessibilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [assigneeUserId, setAssigneeUserId] = useState('');
  // Unchecked (false) is sent to DocumentUploader as `undefined`, not
  // `false` -- an omitted upload-time override inherits the tenant's own
  // aiRemediation.fullAutoModeDefault setting, while an explicit `false`
  // would force Full Auto Mode off for this file even if the tenant
  // default is on. Checking the box only ever opts a file IN.
  const [fullAutoMode, setFullAutoMode] = useState(false);

  // A Team Leader can lead more than one team, so each entry carries its
  // own teamName -- group so the dropdown can label unambiguously which
  // team's Executive is being picked.
  const isTeamLeader = user?.teamMemberships?.some((m) => m.teamRole === 'TEAM_LEADER') ?? false;
  const { data: executivesData } = useTeamExecutives(isTeamLeader);
  const executivesByTeam = useMemo(() => {
    const groups: Record<string, TeamExecutive[]> = {};
    for (const exec of executivesData?.executives ?? []) {
      (groups[exec.teamName] ??= []).push(exec);
    }
    return groups;
  }, [executivesData]);

  const navigateToResults = (jobId: string) => {
    // Validate jobId format to prevent path traversal
    if (!validateJobId(jobId)) {
      setUploadError('Unable to process upload. Please try again or contact support.');
      return;
    }
    // Redirect to the PDF audit results page
    navigate(`/pdf/audit/${jobId}`);
  };

  const handleUploadComplete = (summary: AuditSummary) => navigateToResults(summary.jobId);

  // Fires as soon as the job exists (right after upload, before the audit
  // itself has even started) -- navigating here rather than waiting for
  // handleUploadComplete removes the window where a browser refresh on
  // this page (pure component state, no job ID in the URL) loses the
  // completed-audit view entirely. /pdf/audit/:jobId is fully
  // URL/API-driven and shows its own live progress for a still-running job.
  const handleJobCreated = (jobId: string) => navigateToResults(jobId);

  const handleUploadError = (error: string) => {
    setUploadError(error);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Breadcrumbs items={[{ label: 'PDF Accessibility' }]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary-600" />
            PDF Accessibility
          </h1>
          <p className="text-gray-600 mt-1">
            Upload and audit PDF files for accessibility compliance
          </p>
        </div>
      </div>

      {uploadError && (
        <Alert variant="error" onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Upload a PDF file to analyze its accessibility features and identify issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTeamLeader && (
            <div>
              <label htmlFor="pdf-assign-to" className="block text-sm font-medium text-gray-700 mb-1">
                Assign to
              </label>
              <select
                id="pdf-assign-to"
                value={assigneeUserId}
                onChange={(e) => setAssigneeUserId(e.target.value)}
                className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="">Myself</option>
                {Object.entries(executivesByTeam).map(([teamName, executives]) => (
                  <optgroup key={teamName} label={teamName}>
                    {executives.map((exec) => (
                      <option key={exec.userId} value={exec.userId}>
                        {exec.firstName} {exec.lastName}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
          {/* A <div>, not <label> -- <label> would auto-forward its click to
              the nested Checkbox <button> (buttons are labelable elements),
              which combined with this span's own onClick would
              double-toggle. Same reasoning as PdfAuditResultsPage's own
              Re-run AI Analysis checkboxes. */}
          <div className="flex items-center gap-1.5 text-sm text-gray-700 select-none">
            <Checkbox
              checked={fullAutoMode}
              onChange={setFullAutoMode}
              aria-label="Full Auto Mode"
            />
            <span
              className="cursor-pointer"
              onClick={() => setFullAutoMode((v) => !v)}
              title="Skips the manual &quot;Start Auto Remediation&quot; click for this file -- Auto Mode starts itself once the initial audit and AI analysis complete. Leave unchecked to use your tenant's own default instead."
            >
              Full Auto Mode (skip the manual "Start Auto Remediation" step for this file)
            </span>
          </div>
          <DocumentUploader
            onUploadComplete={handleUploadComplete}
            onJobCreated={handleJobCreated}
            onError={handleUploadError}
            acceptedFileTypes={['pdf']}
            endpoints={{
              pdf: {
                directUpload: '/pdf/audit-upload',
                auditFile: '/pdf/audit-file',
              },
            }}
            assigneeUserId={assigneeUserId || undefined}
            fullAutoMode={fullAutoMode || undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
};
