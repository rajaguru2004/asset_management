'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CustomFieldsRenderer } from './CustomFieldsRenderer';
import { useCategories } from '@/hooks/useCategories';
import { useLibraryItems } from '@/hooks/useLibraries';
import { useAssetMutations } from '@/hooks/useAssets';
import { getErrorMessage } from '@/lib/apiError';
import type { AssetCondition, Asset } from '@/types/assets';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Asset | null;
}

const CONDITION_OPTIONS: { value: AssetCondition; label: string }[] = [
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'UNDER_REPAIR', label: 'Under Repair' },
];

export function AssetForm({ open, onClose, editing }: Props) {
  const { create, update } = useAssetMutations();
  const { data: categories } = useCategories();
  const { data: locations } = useLibraryItems('location');

  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [condition, setCondition] = useState<AssetCondition>('GOOD');
  const [location, setLocation] = useState('');
  const [isShared, setIsShared] = useState(false);
  const [acquisitionCost, setAcquisitionCost] = useState('');
  const [customValues, setCustomValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (!open) return;
    setCategoryId(editing?.categoryId ?? '');
    setName(editing?.name ?? '');
    setSerialNumber(editing?.serialNumber ?? '');
    setCondition(editing?.condition ?? 'GOOD');
    setLocation(editing?.location ?? '');
    setIsShared(editing?.isShared ?? false);
    setAcquisitionCost(editing?.acquisitionCost ?? '');
    setCustomValues(editing?.customValues ?? {});
  }, [open, editing]);

  const category = useMemo(
    () => (categories ?? []).find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const saving = create.isPending || update.isPending;

  const categoryOptions = (categories ?? [])
    .filter((c) => c.isActive)
    .map((c) => ({ value: c.id, label: `${c.name} (${c.tagPrefix})` }));
  const locationOptions = (locations ?? [])
    .filter((l) => l.isActive)
    .map((l) => ({ value: l.dataId, label: (l.data.label as string) ?? l.dataId }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    if (!editing && !categoryId) return toast.error('Category is required');

    const payload = {
      name: name.trim(),
      ...(editing ? {} : { categoryId: Number(categoryId) }),
      serialNumber: serialNumber.trim() || undefined,
      condition,
      location: location || undefined,
      isShared,
      acquisitionCost: acquisitionCost ? Number(acquisitionCost) : undefined,
      customValues,
    };

    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        toast.success('Asset updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Asset registered');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save asset'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit asset' : 'Register asset'}
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Name"
            className="col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            placeholder={editing ? undefined : 'Select category…'}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
            disabled={!!editing}
          />
          <Input
            label="Serial number"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
          <Select
            label="Condition"
            options={CONDITION_OPTIONS}
            value={condition}
            onChange={(e) => setCondition(e.target.value as AssetCondition)}
          />
          <Select
            label="Location"
            options={locationOptions}
            placeholder="Select location…"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Input
            label="Acquisition cost"
            type="number"
            value={acquisitionCost}
            onChange={(e) => setAcquisitionCost(e.target.value)}
          />
          <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isShared}
              onChange={(e) => setIsShared(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            Shared / bookable resource
          </label>
        </div>

        {category && category.customFields.length > 0 && (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium text-foreground">{category.name} details</p>
            <CustomFieldsRenderer
              fields={category.customFields}
              values={customValues}
              onChange={(key, value) => setCustomValues((v) => ({ ...v, [key]: value }))}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editing ? 'Save changes' : 'Register asset'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AssetForm;
