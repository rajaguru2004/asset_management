'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Pencil, Plus, Search, Tags, Trash2 } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { getErrorMessage } from '@/lib/apiError';
import type { Category, CreateCategoryDto } from '@/types/asset';

const selectClass =
  'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

function CategoryForm({
  defaultValues,
  submitting,
  onSubmit,
  onCancel,
}: {
  defaultValues: CategoryFormValues;
  submitting: boolean;
  onSubmit: (values: CategoryFormValues) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name"
        placeholder="Laptops"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="w-full">
        <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
        <textarea
          rows={3}
          placeholder="Optional"
          className={selectClass}
          {...register('description')}
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-ring/30"
          {...register('isActive')}
        />
        Active
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}

export default function CategoriesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const { data, isLoading } = useCategories({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
  });

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categories = data?.items ?? [];
  const total = data?.total ?? 0;

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    const dto: CreateCategoryDto = {
      name: values.name,
      description: values.description || undefined,
      isActive: values.isActive,
    };

    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, dto });
        toast.success('Category updated');
      } else {
        await createMutation.mutateAsync(dto);
        toast.success('Category created');
      }
      closeModal();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save category'));
    }
  };

  const handleDelete = (category: Category) => {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    deleteMutation.mutate(category.id, {
      onSuccess: () => toast.success('Category deleted'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not delete category')),
    });
  };

  const formDefaults: CategoryFormValues = editing
    ? {
        name: editing.name,
        description: editing.description ?? '',
        isActive: editing.isActive,
      }
    : { name: '', description: '', isActive: true };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Categories</h1>
          <p className="text-sm text-muted">{total} total categories</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </div>

      <div className="relative sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Description</TH>
              <TH>Status</TH>
              <TH className="text-right">Actions</TH>
            </tr>
          </THead>
          <TBody>
            {isLoading ? (
              <tr>
                <TD colSpan={4} className="py-10 text-center text-muted">
                  Loading categories...
                </TD>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <TD colSpan={4} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted">
                    <Tags className="h-8 w-8 opacity-40" />
                    <span>No categories found</span>
                  </div>
                </TD>
              </tr>
            ) : (
              categories.map((category) => (
                <TR key={category.id}>
                  <TD className="font-medium">{category.name}</TD>
                  <TD className="max-w-md truncate text-muted">
                    {category.description || '—'}
                  </TD>
                  <TD>
                    <Badge variant={category.isActive ? 'success' : 'neutral'}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(category)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-muted-bg hover:text-foreground"
                        aria-label="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        className="rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-danger dark:hover:bg-red-500/10"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Category' : 'New Category'}
      >
        <CategoryForm
          key={editing?.id ?? 'new'}
          defaultValues={formDefaults}
          submitting={createMutation.isPending || updateMutation.isPending}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
