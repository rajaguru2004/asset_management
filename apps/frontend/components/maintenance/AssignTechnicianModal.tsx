'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { useUsers } from '@/hooks/useUsers';
import { useMaintenanceMutations } from '@/hooks/useMaintenance';
import { getErrorMessage } from '@/lib/apiError';
import type { MaintenanceRequest } from '@/types/maintenance';

export function AssignTechnicianModal({
  request,
  onClose,
}: {
  request: MaintenanceRequest | null;
  onClose: () => void;
}) {
  const { data: usersData } = useUsers({ isActive: true, limit: 100 });
  const { assign } = useMaintenanceMutations();
  const [technicianId, setTechnicianId] = useState<number | ''>('');

  useEffect(() => setTechnicianId(''), [request]);

  const options = (usersData?.items ?? []).map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }));

  const submit = async () => {
    if (!request || !technicianId) {
      toast.error('Pick a technician');
      return;
    }
    try {
      await assign.mutateAsync({ id: request.id, payload: { technicianId: Number(technicianId) } });
      toast.success('Technician assigned');
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not assign technician'));
    }
  };

  return (
    <Modal open={!!request} onClose={onClose} title={`Assign technician — ${request?.issue ?? ''}`} className="max-w-md">
      <div className="space-y-4">
        <Select
          label="Technician"
          options={options}
          placeholder="Select an active user…"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value ? Number(e.target.value) : '')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} isLoading={assign.isPending}>
            Assign
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AssignTechnicianModal;
