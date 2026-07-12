'use client';

import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { useMaintenanceRequests } from '@/hooks/useMaintenance';
import { RequestCard } from './RequestCard';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { RejectModal } from './RejectModal';
import { ResolveModal } from './ResolveModal';
import { LoadingRows } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import type { MaintenanceRequest, MaintenanceRequestStatus } from '@/types/maintenance';

const COLUMNS: { id: MaintenanceRequestStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'TECHNICIAN_ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export function MaintenanceBoard() {
  const { data, isLoading } = useMaintenanceRequests({ limit: 100 });
  const [assigning, setAssigning] = useState<MaintenanceRequest | null>(null);
  const [rejecting, setRejecting] = useState<MaintenanceRequest | null>(null);
  const [resolving, setResolving] = useState<MaintenanceRequest | null>(null);

  if (isLoading) return <LoadingRows />;

  const items = data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState icon={Wrench} title="No maintenance requests" description="Raise one to get started." />;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {COLUMNS.map((col) => {
          const colItems = items.filter((r) => r.status === col.id);
          return (
            <div key={col.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{col.label}</h3>
                <span className="rounded-full bg-muted-bg px-2 py-0.5 text-xs font-medium text-muted">
                  {colItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {colItems.map((r) => (
                  <RequestCard key={r.id} request={r} onAssign={setAssigning} onReject={setRejecting} onResolve={setResolving} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AssignTechnicianModal request={assigning} onClose={() => setAssigning(null)} />
      <RejectModal request={rejecting} onClose={() => setRejecting(null)} />
      <ResolveModal request={resolving} onClose={() => setResolving(null)} />
    </>
  );
}

export default MaintenanceBoard;
