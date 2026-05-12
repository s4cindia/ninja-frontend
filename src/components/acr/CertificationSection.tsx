import { useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import type { PublisherMetadata } from '@/types/acr.types';

interface CertificationSectionProps {
  metadata: PublisherMetadata;
}

/**
 * Reject anything that isn't an http(s) URL so a `javascript:` (or other
 * scheme) value in the backend payload can't slip into an href and become
 * an exploitable click path. Returns null when the input is not a safe
 * absolute web URL; callers should treat null as "no link" and disable
 * the affected anchor.
 */
function toSafeExternalUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/**
 * Publisher-specific Certification block rendered at the top of the ACR
 * report when the VPAT was generated against a publisher-pinned edition
 * (today: PRH UK). Hidden entirely for the standard editions.
 */
export function CertificationSection({ metadata }: CertificationSectionProps) {
  const [showTdmNote, setShowTdmNote] = useState(false);
  const credentialHref = toSafeExternalUrl(metadata.credentialUrl);
  const statementHref = toSafeExternalUrl(metadata.accessibilitySummaryUrl);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="h-5 w-5 text-teal-600" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900">Certification</h2>
      </div>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-600">Certified by</dt>
          <dd className="font-medium text-gray-900">{metadata.certifiedBy}</dd>
        </div>
        <div>
          <dt className="text-gray-600">Credential</dt>
          <dd className="font-medium text-gray-900">
            {credentialHref ? (
              <a
                href={credentialHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline"
              >
                {metadata.certifierCredential}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            ) : (
              // Render the credential label without an anchor if the URL is
              // missing or has an unsafe scheme — keeps the field visible but
              // not clickable.
              <span>{metadata.certifierCredential}</span>
            )}
          </dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-gray-600">Conforms to</dt>
          <dd className="font-medium text-gray-900">{metadata.conformsTo}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-gray-600">Accessibility statement</dt>
          <dd className="font-medium">
            {statementHref ? (
              <a
                href={statementHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 hover:underline break-all"
              >
                {statementHref}
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <span className="text-gray-600 italic">Not provided</span>
            )}
          </dd>
        </div>
      </dl>

      {metadata.tdmReservationNote && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTdmNote((v) => !v)}
            aria-expanded={showTdmNote}
            className="text-xs font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
          >
            {showTdmNote ? 'Hide' : 'Show'} TDM-reservation note
          </button>
          {showTdmNote && (
            <p className="mt-2 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded p-3">
              {metadata.tdmReservationNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
