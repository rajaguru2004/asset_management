'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useAssets } from '@/hooks/useAssets';
import { useMaintenanceMutations } from '@/hooks/useMaintenance';
import { getErrorMessage } from '@/lib/apiError';
import type { MaintenancePriority } from '@/types/maintenance';

const PRIORITY_OPTIONS: { value: MaintenancePriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export function RequestForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: assetsData } = useAssets({ limit: 100 });
  const { create } = useMaintenanceMutations();

  const [assetId, setAssetId] = useState<number | ''>('');
  const [issue, setIssue] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<MaintenancePriority>('MEDIUM');

  useEffect(() => {
    if (!open) return;
    setAssetId('');
    setIssue('');
    setDescription('');
    setPriority('MEDIUM');
  }, [open]);

  const assetOptions = (assetsData?.items ?? []).map((a) => ({ value: a.id, label: `${a.assetTag} — ${a.name}` }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      toast.error('Pick an asset');
      return;
    }
    if (!issue.trim()) {
      toast.error('Issue is required');
      return;
    }
    try {
      await create.mutateAsync({
        assetId: Number(assetId),
        issue: issue.trim(),
        description: description.trim() || undefined,
        priority,
      });
      toast.success('Maintenance request submitted');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit request'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Raise maintenance request" className="max-w-lg">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Asset"
          options={assetOptions}
          placeholder="Select an asset…"
          value={assetId}
          onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : '')}
        />
        <Input label="Issue" value={issue} onChange={(e) => setIssue(e.target.value)} placeholder="Screen broken" />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details"
        />
        <Select
          label="Priority"
          options={PRIORITY_OPTIONS}
          value={priority}
          onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Submit request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RequestForm;
