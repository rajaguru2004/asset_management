'use client';

import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { useMaintenanceMutations } from '@/hooks/useMaintenance';
import { PermissionGate } from '@/components/common/PermissionGate';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PriorityBadge } from './PriorityBadge';
import { getErrorMessage } from '@/lib/apiError';
import { Action, Resource } from '@/lib/permissions';
import type { MaintenanceRequest } from '@/types/maintenance';

export function RequestCard({
  request,
  onAssign,
  onReject,
  onResolve,
}: {
  request: MaintenanceRequest;
  onAssign: (r: MaintenanceRequest) => void;
  onReject: (r: MaintenanceRequest) => void;
  onResolve: (r: MaintenanceRequest) => void;
}) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { approve, start, cancel } = useMaintenanceMutations();

  const act = async (fn: () => Promise<unknown>, okMsg: string, errMsg: string) => {
    try {
      await fn();
      toast.success(okMsg);
    } catch (err) {
      toast.error(getErrorMessage(err, errMsg));
    }
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{request.issue}</p>
          <p className="truncate text-xs text-muted">
            {request.asset.assetTag} — {request.asset.name}
          </p>
        </div>
        <PriorityBadge priority={request.priority} />
      </div>

      <p className="text-xs text-muted">
        Raised by {request.requestedBy.firstName} {request.requestedBy.lastName}
      </p>
      {request.technician && (
        <p className="text-xs text-muted">
          Technician: {request.technician.firstName} {request.technician.lastName}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 pt-1">
        {request.status === 'PENDING' && (
          <>
            <PermissionGate resource={Resource.MAINTENANCE} action={Action.UPDATE}>
              <Button
                size="sm"
                onClick={() => act(() => approve.mutateAsync(request.id), 'Request approved', 'Could not approve')}
                isLoading={approve.isPending}
              >
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => onReject(request)}>
                Reject
              </Button>
            </PermissionGate>
            {request.requestedById === currentUserId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => act(() => cancel.mutateAsync(request.id), 'Request cancelled', 'Could not cancel')}
                isLoading={cancel.isPending}
              >
                Cancel
              </Button>
            )}
          </>
        )}
        {request.status === 'APPROVED' && (
          <PermissionGate resource={Resource.MAINTENANCE} action={Action.UPDATE}>
            <Button size="sm" onClick={() => onAssign(request)}>
              Assign technician
            </Button>
          </PermissionGate>
        )}
        {request.status === 'TECHNICIAN_ASSIGNED' && (
          <PermissionGate resource={Resource.MAINTENANCE} action={Action.UPDATE}>
            <Button
              size="sm"
              onClick={() =>
                act(() => start.mutateAsync(request.id), 'Work started — asset flagged Under Maintenance', 'Could not start')
              }
              isLoading={start.isPending}
            >
              Start work
            </Button>
          </PermissionGate>
        )}
        {request.status === 'IN_PROGRESS' && (
          <PermissionGate resource={Resource.MAINTENANCE} action={Action.UPDATE}>
            <Button size="sm" onClick={() => onResolve(request)}>
              Resolve
            </Button>
          </PermissionGate>
        )}
      </div>
    </Card>
  );
}

export default RequestCard;
