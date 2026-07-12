'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useCategoryMutations } from '@/hooks/useCategories';
import { getErrorMessage } from '@/lib/apiError';
import type { Category, CustomField, CustomFieldType } from '@/types/organization';

interface Props {
  open: boolean;
  onClose: () => void;
  editing: Category | null;
}

const TYPE_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'select', label: 'Select (library)' },
];

export function CategoryForm({ open, onClose, editing }: Props) {
  const { create, update } = useCategoryMutations();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagPrefix, setTagPrefix] = useState('AF');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setTagPrefix(editing?.tagPrefix ?? 'AF');
    setSortOrder(editing?.sortOrder ?? 0);
    setIsActive(editing?.isActive ?? true);
    setFields(editing?.customFields ? editing.customFields.map((f) => ({ ...f })) : []);
  }, [open, editing]);

  const saving = create.isPending || update.isPending;

  const addField = () =>
    setFields((f) => [...f, { key: '', label: '', type: 'text', required: false }]);
  const removeField = (i: number) => setFields((f) => f.filter((_, idx) => idx !== i));
  const patchField = (i: number, patch: Partial<CustomField>) =>
    setFields((f) => f.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    const cleaned = fields
      .map((f) => ({ ...f, key: f.key.trim(), label: f.label.trim() }))
      .filter((f) => f.key || f.label);
    for (const f of cleaned) {
      if (!f.key || !f.label) {
        toast.error('Every custom field needs a key and a label');
        return;
      }
    }
    const payload = {
      name: name.trim(),
      description: description.trim(),
      tagPrefix: tagPrefix.trim() || 'AF',
      sortOrder: Number(sortOrder) || 0,
      isActive,
      customFields: cleaned,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
        toast.success('Category updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Category created');
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save category'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit category' : 'New asset category'}
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Name"
            placeholder="Electronics"
            className="col-span-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            label="Tag prefix"
            placeholder="ELEC"
            value={tagPrefix}
            onChange={(e) => setTagPrefix(e.target.value.toUpperCase())}
            maxLength={8}
            className="uppercase"
          />
        </div>
        <Input
          label="Description"
          placeholder="Laptops, monitors, phones…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="rounded-xl border border-border p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Custom fields</p>
              <p className="text-xs text-muted">
                Category-specific attributes (e.g. warranty period). Assets in this category will
                capture these.
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addField}>
              <Plus className="h-4 w-4" /> Add field
            </Button>
          </div>

          {fields.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted">No custom fields.</p>
          ) : (
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="grid grid-cols-12 items-center gap-2">
                    <input
                      placeholder="key"
                      value={f.key}
                      onChange={(e) => patchField(i, { key: e.target.value })}
                      className="col-span-3 rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                    <input
                      placeholder="Label"
                      value={f.label}
                      onChange={(e) => patchField(i, { label: e.target.value })}
                      className="col-span-4 rounded-lg border border-border bg-card px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                    <select
                      value={f.type}
                      onChange={(e) => patchField(i, { type: e.target.value as CustomFieldType })}
                      className="col-span-3 rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <label className="col-span-1 flex items-center justify-center" title="Required">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => patchField(i, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-border accent-[var(--primary)]"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeField(i)}
                      className="col-span-1 flex justify-center rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {f.type === 'select' && (
                    <input
                      placeholder="library.config.ts libName, e.g. location"
                      value={f.libraryName ?? ''}
                      onChange={(e) => patchField(i, { libraryName: e.target.value })}
                      className="ml-0 w-full rounded-lg border border-border bg-card px-2.5 py-2 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                    />
                  )}
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted">
                Columns: key · label · type · required
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Input
            label="Sort order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-32"
          />
          <label className="mt-6 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-[var(--primary)]"
            />
            Active
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" isLoading={saving}>
            {editing ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CategoryForm;
