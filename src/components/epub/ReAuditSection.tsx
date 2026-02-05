import React, { useState, useCallback } from "react";
import {
  Upload,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/services/api";

export interface ReauditResult {
  originalIssues: number;
  resolved: number;
  stillPending: number;
  newIssuesFound?: Array<{
    code: string;
    message: string;
    severity: string;
  }>;
  score?: number;

  resolvedIssueCodes?: string[];
}

interface ReAuditSectionProps {
  jobId: string;
  pendingCount: number;
  onReauditComplete: (result: ReauditResult) => void;
  isDemo?: boolean;
}

export const ReAuditSection: React.FC<ReAuditSectionProps> = ({
  jobId,
  pendingCount,
  onReauditComplete,
  isDemo = false,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ReauditResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (!file.name.toLowerCase().endsWith(".epub")) {
        setError("Please upload an EPUB file");
        return;
      }

      setIsUploading(true);
      setError(null);
      setResult(null);

      try {
        if (isDemo) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const demoResult: ReauditResult = {
            originalIssues: pendingCount,
            resolved: Math.floor(pendingCount * 0.7),
            stillPending: Math.ceil(pendingCount * 0.3),
            newIssuesFound: [],
            score: 85,
          };
          setResult(demoResult);
          onReauditComplete(demoResult);
        } else {
          const formData = new FormData();
          formData.append("epub", file);

          const response = await api.post(
            `/epub/job/${jobId}/reaudit`,
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            },
          );

          const data = response.data.data || response.data;
          setResult(data);
          onReauditComplete(data);
        }
      } catch (err) {
        console.error("Re-audit failed:", err);
        setError("Failed to analyze EPUB. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [jobId, pendingCount, onReauditComplete, isDemo],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/epub+zip": [".epub"] },
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <RefreshCw className="h-5 w-5" />
          Re-Audit After Manual Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          {pendingCount > 0 ? (
            <>
              After fixing the{" "}
              <span className="font-medium text-blue-700">{pendingCount}</span>{" "}
              pending issues manually, upload the fixed EPUB to verify the
              issues are resolved.
            </>
          ) : (
            <>
              Upload the remediated EPUB to verify all fixes and check for any
              new accessibility issues that may have been introduced.
            </>
          )}
        </p>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? "border-blue-500 bg-blue-100" : "border-blue-300 hover:border-blue-400 bg-white"}
            ${isUploading ? "pointer-events-none opacity-75" : ""}`}
          role="button"
          aria-label="Upload fixed EPUB file"
        >
          <input {...getInputProps()} aria-label="EPUB file upload" />
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Spinner size="md" />
              <p className="text-blue-600 font-medium">Analyzing EPUB...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto mb-3 text-blue-400" />
              <p className="text-gray-700 font-medium">
                {isDragActive
                  ? "Drop your EPUB here"
                  : "Drop your manually-fixed EPUB here"}
              </p>
              <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            </>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <XCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {result && (
          <div className="p-4 bg-white rounded-lg border border-blue-200">
            <h4 className="font-medium text-gray-900 mb-3">Re-Audit Results</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xl font-bold text-gray-700">
                  {result.originalIssues}
                </p>
                <p className="text-xs text-gray-500">Original Issues</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-xl font-bold text-green-600">
                  {result.resolved}
                </p>
                <p className="text-xs text-green-700">Resolved</p>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <p className="text-xl font-bold text-yellow-600">
                  {result.stillPending}
                </p>
                <p className="text-xs text-yellow-700">Still Pending</p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <p className="text-xl font-bold text-red-600">
                  {result.newIssuesFound?.length || 0}
                </p>
                <p className="text-xs text-red-700">New Issues</p>
              </div>
            </div>

            {result.newIssuesFound && result.newIssuesFound.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h5 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  New Issues Found
                </h5>
                <ul className="space-y-2">
                  {result.newIssuesFound.map((issue, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <Badge variant="error" size="sm">
                        {issue.severity}
                      </Badge>
                      <span className="text-gray-700">{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.score !== undefined && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Updated Accessibility Score
                  </span>
                  <span
                    className={`text-lg font-bold ${result.score >= 80 ? "text-green-600" : result.score >= 60 ? "text-yellow-600" : "text-red-600"}`}
                  >
                    {result.score}%
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
