'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useUsers } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { useAllocationMutations } from '@/hooks/useAllocations';
import { getErrorMessage } from '@/lib/apiError';
import type { Asset } from '@/types/assets';
import type { ApiError } from '@/types/api';

interface Props {
  asset: Asset | null;
  onClose: () => void;
}

interface ConflictInfo {
  holder: { firstName?: string; lastName?: string; name?: string; code?: string } | null;
  allocatedAt?: string;
  canRequestTransfer?: boolean;
}

export function AllocateModal({ asset, onClose }: Props) {
  const { allocate, transferRequest } = useAllocationMutations();
  const { data: usersData } = useUsers({ isActive: true, limit: 100 });
  const { data: departments } = useDepartments();

  const [mode, setMode] = useState<'user' | 'department'>('user');
  const [targetId, setTargetId] = useState<number | ''>('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  useEffect(() => {
    setMode('user');
    setTargetId('');
    setExpectedReturnDate('');
    setNotes('');
    setConflict(null);
  }, [asset]);

  const userOptions = (usersData?.items ?? []).map((u) => ({
    value: u.id,
    label: `${u.firstName} ${u.lastName}`,
  }));
  const deptOptions = (departments ?? [])
    .filter((d) => d.isActive)
    .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !targetId) {
      toast.error('Pick a target');
      return;
    }
    try {
      await allocate.mutateAsync({
        assetId: asset.id,
        userId: mode === 'user' ? Number(targetId) : undefined,
        departmentId: mode === 'department' ? Number(targetId) : undefined,
        expectedReturnDate: expectedReturnDate || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`${asset.name} allocated`);
      onClose();
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.statusCode === 409 && apiErr.errors) {
        setConflict(apiErr.errors as ConflictInfo);
        return;
      }
      toast.error(getErrorMessage(err, 'Could not allocate asset'));
    }
  };

  const requestTransfer = async () => {
    if (!asset) return;
    try {
      await transferRequest.mutateAsync({ assetId: asset.id, notes: notes.trim() || undefined });
      toast.success('Transfer requested — awaiting approval');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not request transfer'));
    }
  };

  const holderLabel = (h: ConflictInfo['holder']) => {
    if (!h) return 'Unknown';
    return h.firstName ? `${h.firstName} ${h.lastName ?? ''}`.trim() : (h.name ?? h.code ?? 'Unknown');
  };

  return (
    <Modal open={!!asset} onClose={onClose} title={`Allocate ${asset?.name ?? ''}`} className="max-w-md">
      {conflict ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300/40 bg-amber-100/40 p-4 text-sm dark:bg-amber-500/10">
            <p className="font-medium text-foreground">Already allocated</p>
            <p className="mt-2 text-muted">
              Holder: <Badge variant="warning">{holderLabel(conflict.holder)}</Badge>
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            {conflict.canRequestTransfer && (
              <Button type="button" onClick={requestTransfer} isLoading={transferRequest.isPending}>
                Request Transfer
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'user' ? 'primary' : 'outline'}
              onClick={() => {
                setMode('user');
                setTargetId('');
              }}
            >
              Employee
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'department' ? 'primary' : 'outline'}
              onClick={() => {
                setMode('department');
                setTargetId('');
              }}
            >
              Department
            </Button>
          </div>
          <Select
            label={mode === 'user' ? 'Employee' : 'Department'}
            options={mode === 'user' ? userOptions : deptOptions}
            placeholder="Select…"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : '')}
          />
          <Input
            label="Expected return date"
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" isLoading={allocate.isPending}>
              Allocate
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default AllocateModal;
