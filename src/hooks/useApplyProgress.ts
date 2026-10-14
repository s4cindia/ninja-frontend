/**
 * Live progress for the "Apply AI Fixes" step — the manual bulk Apply All
 * action, or Auto Mode's own apply step (same backend channel covers both,
 * disambiguated by `source`) — via a short-lived SSE connection.
 *
 * Purely additive: existing polling (useAutoModeStatus, the audit/AI
 * refetch effect in PdfAuditResultsPage) remains the authoritative source
 * once the step settles. If this never connects, or drops mid-step, nothing
 * else breaks — the caller just sees no live numbers and falls back to
 * whatever the next poll reports, exactly as before this hook existed.
 *
 * Mirrors BatchProgress.tsx's direct-connect approach (not
 * batch.service.ts's subscribeToBatch, which layers a manual
 * exponential-backoff reconnect loop on top) — the native EventSource
 * already retries transient drops on its own, and this indicator only needs
 * to live for the duration of a single in-flight step.
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/api';

export type ApplyProgressSource = 'apply_all' | 'auto_loop';

export interface ApplyProgressState {
  applied: number | null;
  failed: number | null;
  processed: number | null;
  total: number | null;
  source: ApplyProgressSource | null;
  /** True once the 'subscribed' handshake or a progress message has arrived. */
  connected: boolean;
}

interface ApplyProgressMessage {
  type: 'subscribed' | 'apply_progress';
  jobId?: string;
  channel?: string;
  source?: ApplyProgressSource;
  applied?: number;
  failed?: number;
  processed?: number;
  total?: number;
}

const INITIAL_STATE: ApplyProgressState = {
  applied: null,
  failed: null,
  processed: null,
  total: null,
  source: null,
  connected: false,
};

export function useApplyProgress(jobId: string | undefined, opts: { enabled: boolean }): ApplyProgressState {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [state, setState] = useState<ApplyProgressState>(INITIAL_STATE);

  useEffect(() => {
    if (!opts.enabled || !jobId || !accessToken) {
      setState(INITIAL_STATE);
      return;
    }

    // Reset at the start of each new in-flight step, so a previous step's
    // stale counts don't bleed into this one.
    setState(INITIAL_STATE);

    const url = `${api.defaults.baseURL}/sse/pdf/${encodeURIComponent(jobId)}/apply-progress?token=${encodeURIComponent(accessToken)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      let data: ApplyProgressMessage;
      try {
        data = JSON.parse(event.data);
      } catch {
        // A nice-to-have indicator shouldn't throw over one malformed frame
        // — ignore it and keep the last known-good state.
        return;
      }

      if (data.type === 'subscribed') {
        setState((prev) => ({ ...prev, connected: true }));
      } else if (data.type === 'apply_progress') {
        setState({
          applied: data.applied ?? null,
          failed: data.failed ?? null,
          processed: data.processed ?? null,
          total: data.total ?? null,
          source: data.source ?? null,
          connected: true,
        });
      }
    };

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      es.close();
    };
  }, [jobId, accessToken, opts.enabled]);

  return state;
}
