'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useMaintenanceMutations } from '@/hooks/useMaintenance';
import { getErrorMessage } from '@/lib/apiError';
import type { MaintenanceRequest } from '@/types/maintenance';

export function ResolveModal({ request, onClose }: { request: MaintenanceRequest | null; onClose: () => void }) {
  const { resolve } = useMaintenanceMutations();
  const [notes, setNotes] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    setNotes('');
    setCost('');
  }, [request]);

  const submit = async () => {
    if (!request) return;
    if (!notes.trim()) {
      toast.error('Resolution notes are required');
      return;
    }
    try {
      await resolve.mutateAsync({
        id: request.id,
        payload: { resolutionNotes: notes.trim(), cost: cost ? Number(cost) : undefined },
      });
      toast.success('Request resolved');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not resolve request'));
    }
  };

  return (
    <Modal open={!!request} onClose={onClose} title={`Resolve — ${request?.issue ?? ''}`} className="max-w-md">
      <div className="space-y-4">
        <Input label="Resolution notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Replaced screen assembly" />
        <Input label="Cost" type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Optional" />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={resolve.isPending}>
            Resolve
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default ResolveModal;
