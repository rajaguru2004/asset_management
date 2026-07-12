'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useDepartmentMutations } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { getErrorMessage } from '@/lib/apiError';
import type { Department } from '@/types/organization';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Department | null;
  departments: Department[];
}

export function DepartmentForm({ open, onClose, editing, departments }: Props) {
  const { create, update } = useDepartmentMutations();
  const { data: users } = useUsers({ isActive: true, limit: 100 });

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [headId, setHeadId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setCode(editing?.code ?? '');
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setParentId(editing?.parentId ? String(editing.parentId) : '');
    setHeadId(editing?.headId ? String(editing.headId) : '');
    setIsActive(editing?.isActive ?? true);
  }, [open, editing]);

  const parentOptions = useMemo(
    () =>
      departments
        .filter((d) => d.id !== editing?.id)
        .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` })),
    [departments, editing],
  );

  const headOptions = useMemo(
    () =>
      (users?.items ?? []).map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName} (${u.email})`,
      })),
    [users],
  );

  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      toast.error('Code and name are required');
      return;
    }
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      parentId: parentId ? Number(parentId) : null,
      headId: headId ? Number(headId) : null,
      isActive,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        toast.success('Department updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Department created');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save department'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit department' : 'New department'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Code"
            placeholder="IT"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="uppercase"
            maxLength={12}
          />
          <Input
            label="Name"
            placeholder="Information Technology"
            className="col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <Input
          label="Description"
          placeholder="What this department does"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Parent department"
            placeholder="— None —"
            options={parentOptions}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          />
          <Select
            label="Department head"
            placeholder="— Unassigned —"
            options={headOptions}
            value={headId}
            onChange={(e) => setHeadId(e.target.value)}
          />
        </div>
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
            {editing ? 'Save changes' : 'Create department'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default DepartmentForm;
