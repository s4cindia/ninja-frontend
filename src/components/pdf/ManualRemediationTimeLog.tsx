/**
 * ManualRemediationTimeLog
 *
 * Self-reported time-tracking for out-of-app remediation (e.g. Acrobat Pro)
 * on guidance-only items Ninja can't auto-fix. Invisible to the automatic
 * ninjaActiveMs timer, which only tracks time active on Ninja's own pages —
 * without this, that understates Ninja's true effort vs. pdfxt in the
 * Comparison Study.
 *
 * Deliberately independent of the guided remediation checklist's step 4:
 * an operator who manually resolves every guidance-only item (arguably
 * spending the *most* Acrobat time) never triggers the acknowledge-and-skip
 * flow at all, so this can't be gated on that step's status.
 */

import { useCallback, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, getErrorMessage } from '@/services/api';

interface ManualRemediationTimeLogProps {
  jobId: string;
  manualRemediationMs: number;
  onLogged: (totalMs: number, lastLoggedAt?: string) => void;
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function ManualRemediationTimeLog({ jobId, manualRemediationMs, onLogged }: ManualRemediationTimeLogProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [minutesInput, setMinutesInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedMinutes = Number(minutesInput);
  const isValid = minutesInput.trim() !== '' && Number.isFinite(parsedMinutes) && parsedMinutes > 0;

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setMinutesInput('');
    setNoteInput('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isValid || !jobId) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/pdf/${encodeURIComponent(jobId)}/manual-remediation-time`, {
        minutes: parsedMinutes,
        ...(noteInput.trim() ? { note: noteInput.trim() } : {}),
      });
      const totalMinutes = res.data.data.totalMinutes as number;
      const log = res.data.data.log as Array<{ loggedAt?: string }> | undefined;
      // The just-appended entry's own timestamp — lets the guided remediation
      // checklist's step 7 (confirm manual fixes) react immediately, without
      // waiting for the next /auto-tag/status poll to pick it up.
      const lastLoggedAt = log && log.length > 0 ? log[log.length - 1]?.loggedAt : undefined;
      onLogged(Math.round(totalMinutes * 60000), lastLoggedAt);
      closeForm();
      toast.success('Manual remediation time logged');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [jobId, isValid, parsedMinutes, noteInput, onLogged, closeForm]);

  return (
    <Card className="mx-6 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-700 flex-1">
            Manual remediation time (Acrobat Pro, etc.): <strong>{formatDuration(manualRemediationMs)}</strong> logged
          </span>
          {!isFormOpen && (
            <Button size="sm" variant="outline" onClick={() => setIsFormOpen(true)}>
              Log time
            </Button>
          )}
        </div>

        {isFormOpen && (
          <div className="mt-3 pl-7 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="1"
                value={minutesInput}
                onChange={(e) => setMinutesInput(e.target.value)}
                placeholder="Minutes"
                className="w-28"
                disabled={isSubmitting}
              />
              <span className="text-xs text-gray-500">minutes spent outside Ninja</span>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Optional note (e.g. what you fixed in Acrobat)"
              rows={2}
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
              disabled={isSubmitting}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={!isValid || isSubmitting} onClick={handleSubmit}>
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="outline" disabled={isSubmitting} onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
