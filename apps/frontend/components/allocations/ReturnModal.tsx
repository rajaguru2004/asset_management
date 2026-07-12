'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAllocationMutations } from '@/hooks/useAllocations';
import { getErrorMessage } from '@/lib/apiError';
import type { Allocation } from '@/types/allocations';

const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
];

export function ReturnModal({
  allocation,
  onClose,
}: {
  allocation: Allocation | null;
  onClose: () => void;
}) {
  const { returnAsset } = useAllocationMutations();
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setCondition('GOOD');
    setNotes('');
  }, [allocation]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocation) return;
    try {
      await returnAsset.mutateAsync({
        id: allocation.id,
        payload: { returnCondition: condition, notes: notes.trim() || undefined },
      });
      toast.success(`${allocation.asset.name} returned`);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not return asset'));
    }
  };

  return (
    <Modal
      open={!!allocation}
      onClose={onClose}
      title={`Return ${allocation?.asset.name ?? ''}`}
      className="max-w-md"
    >
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Condition on return"
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        />
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={returnAsset.isPending}>
            Confirm return
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ReturnModal;
