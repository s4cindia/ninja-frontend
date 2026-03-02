import { useState } from 'react';
import { Share2, Copy, Check, Loader2, X } from 'lucide-react';
import { api } from '@/services/api';

interface ShareButtonProps {
  jobId: string;
}

interface ShareTokenResponse {
  data: {
    token: string;
    expiresAt: string;
  };
}

export function ShareButton({ jobId }: ShareButtonProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<ShareTokenResponse>(`/acr/reports/${jobId}/share`);
      const { token } = res.data.data;
      const url = `${window.location.origin}/acr/reports/${jobId}/analysis?token=${token}`;
      setShareUrl(url);
    } catch {
      setError('Failed to create share link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDismiss = () => {
    setShareUrl(null);
    setError(null);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleShare}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-100 bg-white/10 hover:bg-white/20 disabled:opacity-60 rounded-lg transition-colors border border-white/20"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
        Share
      </button>

      {/* Share URL popover */}
      {shareUrl && (
        <div className="absolute right-0 top-12 z-50 w-96 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-gray-800">Share link created</p>
              <p className="text-xs text-gray-500">Valid for 7 days · no login required</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 text-gray-700 font-mono truncate"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute right-0 top-12 z-50 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 w-64">
          {error}
        </div>
      )}
    </div>
  );
}
