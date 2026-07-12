'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useLibraryMutations } from '@/hooks/useLibraries';
import { getErrorMessage } from '@/lib/apiError';
import { LIBRARY_NAMES, type LibraryItem, type LibraryName } from '@/types/library';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: LibraryItem | null;
  defaultLibName?: LibraryName;
}

const LIB_OPTIONS = LIBRARY_NAMES.map((n) => ({ value: n, label: n }));

export function LibraryForm({ open, onClose, editing, defaultLibName }: Props) {
  const { create, update } = useLibraryMutations();
  const [libName, setLibName] = useState<LibraryName>(defaultLibName ?? LIBRARY_NAMES[0]);
  const [dataId, setDataId] = useState('');
  const [label, setLabel] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLibName((editing?.libName as LibraryName) ?? defaultLibName ?? LIBRARY_NAMES[0]);
    setDataId(editing?.dataId ?? '');
    setLabel((editing?.data.label as string) ?? '');
    setIsActive(editing?.isActive ?? true);
  }, [open, editing, defaultLibName]);

  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataId.trim()) {
      toast.error('Key (dataId) is required');
      return;
    }
    if (!label.trim()) {
      toast.error('Label is required');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload: { data: { label: label.trim() }, isActive } });
        toast.success('Library item updated');
      } else {
        await create.mutateAsync({ libName, dataId: dataId.trim(), data: { label: label.trim() }, isActive });
        toast.success('Library item created');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save library item'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit library item' : 'New library item'} className="max-w-md">
      <form onSubmit={submit} className="space-y-4">
        <Select
          label="Library"
          options={LIB_OPTIONS}
          value={libName}
          onChange={(e) => setLibName(e.target.value as LibraryName)}
          disabled={!!editing}
        />
        <Input
          label="Key (dataId)"
          value={dataId}
          onChange={(e) => setDataId(e.target.value.toUpperCase())}
          placeholder="CHN"
          disabled={!!editing}
        />
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Chennai" />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--primary)]"
          />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editing ? 'Save changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default LibraryForm;
