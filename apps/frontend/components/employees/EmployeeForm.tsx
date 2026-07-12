'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUserMutations } from '@/hooks/useUsers';
import { useDepartments } from '@/hooks/useDepartments';
import { getErrorMessage } from '@/lib/apiError';
import { ASSIGNABLE_ROLES } from '@/lib/permissions';
import type { User } from '@/types/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: User | null;
}

export function EmployeeForm({ open, onClose, editing }: Props) {
  const { create, update } = useUserMutations();
  const { data: departments } = useDepartments();
  const isEdit = !!editing;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('4');
  const [departmentId, setDepartmentId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setEmail(editing?.email ?? '');
    setPassword('');
    setFirstName(editing?.firstName ?? '');
    setLastName(editing?.lastName ?? '');
    setPhone(editing?.phone ?? '');
    setRoleId(String(editing?.roleId ?? 4));
    setDepartmentId(editing?.departmentId ? String(editing.departmentId) : '');
    setIsActive(editing?.isActive ?? true);
  }, [open, editing]);

  const deptOptions = useMemo(
    () =>
      (departments ?? [])
        .filter((d) => d.isActive)
        .map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` })),
    [departments],
  );

  const saving = create.isPending || update.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    try {
      if (isEdit && editing) {
        await update.mutateAsync({
          id: editing.id,
          payload: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            departmentId: departmentId ? Number(departmentId) : null,
            isActive,
          },
        });
        toast.success('Employee updated');
      } else {
        if (!email.trim() || password.length < 6) {
          toast.error('Email and a 6+ char password are required');
          return;
        }
        await create.mutateAsync({
          email: email.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim(),
          roleId: Number(roleId),
          departmentId: departmentId ? Number(departmentId) : null,
          isActive,
        });
        toast.success('Employee created');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save employee'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit employee' : 'New employee'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isEdit}
          placeholder="name@assetflow.com"
        />

        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Temporary password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
            <Select
              label="Role"
              options={ASSIGNABLE_ROLES.map((r) => ({ value: r.value, label: r.label }))}
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          <Select
            label="Department"
            placeholder="— Unassigned —"
            options={deptOptions}
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
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

        {isEdit && (
          <p className="rounded-lg bg-muted-bg px-3 py-2 text-xs text-muted">
            To change this person&apos;s role, use <b>Assign role</b> from the directory.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {isEdit ? 'Save changes' : 'Create employee'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EmployeeForm;
