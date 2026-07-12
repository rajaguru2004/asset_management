'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useLibraryItems } from '@/hooks/useLibraries';
import type { CustomField } from '@/types/organization';

interface Props {
  fields: CustomField[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: CustomField;
  value: unknown;
  onChange: (v: string) => void;
}) {
  const { data: items } = useLibraryItems(field.libraryName);
  const options = (items ?? [])
    .filter((i) => i.isActive)
    .map((i) => ({ value: i.dataId, label: (i.data.label as string) ?? i.dataId }));

  return (
    <Select
      label={`${field.label}${field.required ? ' *' : ''}`}
      options={options}
      placeholder="Select…"
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function CustomFieldsRenderer({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => {
        const value = values[field.key];

        if (field.type === 'select') {
          return (
            <SelectField
              key={field.key}
              field={field}
              value={value}
              onChange={(v) => onChange(field.key, v)}
            />
          );
        }

        if (field.type === 'boolean') {
          return (
            <label key={field.key} className="mt-6 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange(field.key, e.target.checked)}
                className="h-4 w-4 rounded border-border accent-[var(--primary)]"
              />
              {field.label}
              {field.required ? ' *' : ''}
            </label>
          );
        }

        return (
          <Input
            key={field.key}
            label={`${field.label}${field.required ? ' *' : ''}`}
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            value={(value as string | number | undefined) ?? ''}
            onChange={(e) =>
              onChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)
            }
          />
        );
      })}
    </div>
  );
}

export default CustomFieldsRenderer;
