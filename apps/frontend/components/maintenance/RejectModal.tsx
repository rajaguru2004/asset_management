'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useMaintenanceMutations } from '@/hooks/useMaintenance';
import { getErrorMessage } from '@/lib/apiError';
import type { MaintenanceRequest } from '@/types/maintenance';

export function RejectModal({ request, onClose }: { request: MaintenanceRequest | null; onClose: () => void }) {
  const { reject } = useMaintenanceMutations();
  const [reason, setReason] = useState('');

  useEffect(() => setReason(''), [request]);

  const submit = async () => {
    if (!request) return;
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    try {
      await reject.mutateAsync({ id: request.id, payload: { reason: reason.trim() } });
      toast.success('Request rejected');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reject request'));
    }
  };

  return (
    <Modal open={!!request} onClose={onClose} title={`Reject — ${request?.issue ?? ''}`} className="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
            placeholder="Not covered under warranty"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Back
          </Button>
          <Button type="button" variant="danger" onClick={submit} isLoading={reject.isPending}>
            Reject
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default RejectModal;
