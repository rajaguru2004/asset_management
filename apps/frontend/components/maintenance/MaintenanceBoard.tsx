'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { Wrench, X } from 'lucide-react';
import { useMaintenanceRequests, useMaintenanceMutations } from '@/hooks/useMaintenance';
import { useAuthStore } from '@/store/authStore';
import { RequestCard } from './RequestCard';
import { AssignTechnicianModal } from './AssignTechnicianModal';
import { RejectModal } from './RejectModal';
import { ResolveModal } from './ResolveModal';
import { LoadingRows } from '@/components/common/Spinner';
import { EmptyState } from '@/components/common/EmptyState';
import { getErrorMessage } from '@/lib/apiError';
import { Action, Resource, hasPermission } from '@/lib/permissions';
import { cn } from '@/utils/cn';
import type { MaintenanceRequest, MaintenanceRequestStatus } from '@/types/maintenance';

const COLUMNS: {
  id: MaintenanceRequestStatus;
  label: string;
  border: string;
  headerBg: string;
  dot: string;
  ring: string;
}[] = [
  { id: 'PENDING', label: 'Pending', border: 'border-t-amber-500', headerBg: 'bg-amber-500/10', dot: 'bg-amber-500', ring: 'ring-amber-500/40' },
  { id: 'APPROVED', label: 'Approved', border: 'border-t-sky-500', headerBg: 'bg-sky-500/10', dot: 'bg-sky-500', ring: 'ring-sky-500/40' },
  { id: 'TECHNICIAN_ASSIGNED', label: 'Assigned', border: 'border-t-violet-500', headerBg: 'bg-violet-500/10', dot: 'bg-violet-500', ring: 'ring-violet-500/40' },
  { id: 'IN_PROGRESS', label: 'In Progress', border: 'border-t-indigo-500', headerBg: 'bg-indigo-500/10', dot: 'bg-indigo-500', ring: 'ring-indigo-500/40' },
  { id: 'RESOLVED', label: 'Resolved', border: 'border-t-emerald-500', headerBg: 'bg-emerald-500/10', dot: 'bg-emerald-500', ring: 'ring-emerald-500/40' },
];

/** Mirror of the backend maintenance-state.machine — illegal drops never fire a request. */
const LEGAL_DROPS: Partial<Record<MaintenanceRequestStatus, MaintenanceRequestStatus>> = {
  PENDING: 'APPROVED',
  APPROVED: 'TECHNICIAN_ASSIGNED',
  TECHNICIAN_ASSIGNED: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
};

function DraggableRequestCard({
  request,
  canDrag,
  onAssign,
  onReject,
  onResolve,
}: {
  request: MaintenanceRequest;
  canDrag: boolean;
  onAssign: (r: MaintenanceRequest) => void;
  onReject: (r: MaintenanceRequest) => void;
  onResolve: (r: MaintenanceRequest) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: request.id,
    data: { request },
    disabled: !canDrag,
  });

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? { ...attributes, ...listeners } : {})}
      className={cn(canDrag && 'cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-40')}
    >
      <RequestCard request={request} onAssign={onAssign} onReject={onReject} onResolve={onResolve} />
    </div>
  );
}

function BoardColumn({
  column,
  items,
  highlight,
  children,
}: {
  column: (typeof COLUMNS)[number];
  items: MaintenanceRequest[];
  highlight: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-64 flex-col rounded-xl border border-border border-t-4 bg-muted-bg/40 transition-shadow',
        column.border,
        (isOver || highlight) && `ring-2 ${column.ring}`,
      )}
    >
      <div className={cn('flex items-center justify-between rounded-t-lg px-3 py-2.5', column.headerBg)}>
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', column.dot)} />
          <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{column.label}</h3>
        </div>
        <span className="rounded-full bg-card px-2 py-0.5 text-xs font-medium text-muted">{items.length}</span>
      </div>
      <div className="flex-1 space-y-3 p-3">{children}</div>
    </div>
  );
}

export function MaintenanceBoard() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<MaintenanceRequestStatus | ''>(
    () => (searchParams.get('status') as MaintenanceRequestStatus) ?? '',
  );

  const { data, isLoading } = useMaintenanceRequests({ limit: 100, status: statusFilter || undefined });
  const { approve, start } = useMaintenanceMutations();
  const roleId = useAuthStore((s) => s.user?.roleId);
  const canDrag = hasPermission(roleId, Resource.MAINTENANCE, Action.UPDATE);

  const [assigning, setAssigning] = useState<MaintenanceRequest | null>(null);
  const [rejecting, setRejecting] = useState<MaintenanceRequest | null>(null);
  const [resolving, setResolving] = useState<MaintenanceRequest | null>(null);
  const [dragged, setDragged] = useState<MaintenanceRequest | null>(null);
  // Optimistic column overrides while a transition is in flight / a modal is open.
  const [overrides, setOverrides] = useState<Record<number, MaintenanceRequestStatus>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const items = useMemo(() => {
    const base = data?.items ?? [];
    return base.map((r) => (overrides[r.id] ? { ...r, status: overrides[r.id] } : r));
  }, [data, overrides]);

  const setOverride = (id: number, status: MaintenanceRequestStatus) =>
    setOverrides((o) => ({ ...o, [id]: status }));
  const clearOverride = (id: number) =>
    setOverrides((o) => {
      const { [id]: _gone, ...rest } = o;
      return rest;
    });

  const runTransition = async (
    request: MaintenanceRequest,
    to: MaintenanceRequestStatus,
    fn: () => Promise<unknown>,
    okMsg: string,
  ) => {
    setOverride(request.id, to);
    try {
      await fn();
      toast.success(okMsg);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the request'));
    } finally {
      clearOverride(request.id);
    }
  };

  const onDragStart = (e: DragStartEvent) => {
    setDragged((e.active.data.current?.request as MaintenanceRequest) ?? null);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDragged(null);
    const request = e.active.data.current?.request as MaintenanceRequest | undefined;
    const target = e.over?.id as MaintenanceRequestStatus | undefined;
    if (!request || !target || request.status === target) return;

    if (LEGAL_DROPS[request.status] !== target) {
      toast.error('Requests flow Pending → Approved → Assigned → In Progress → Resolved');
      return;
    }

    switch (target) {
      case 'APPROVED':
        void runTransition(request, 'APPROVED', () => approve.mutateAsync(request.id), 'Request approved');
        break;
      case 'TECHNICIAN_ASSIGNED':
        // Needs a technician — move optimistically and let the modal finish or snap back.
        setOverride(request.id, 'TECHNICIAN_ASSIGNED');
        setAssigning(request);
        break;
      case 'IN_PROGRESS':
        void runTransition(
          request,
          'IN_PROGRESS',
          () => start.mutateAsync(request.id),
          'Work started — asset flagged Under Maintenance',
        );
        break;
      case 'RESOLVED':
        setOverride(request.id, 'RESOLVED');
        setResolving(request);
        break;
    }
  };

  if (isLoading) return <LoadingRows />;

  const empty = items.length === 0;

  return (
    <>
      {statusFilter && (
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          Filtered: {statusFilter.replaceAll('_', ' ')} <X className="h-3 w-3" />
        </button>
      )}

      {empty ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests"
          description={statusFilter ? 'Nothing matches this filter.' : 'Raise one to get started.'}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setDragged(null)}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {COLUMNS.map((col) => {
              const colItems = items.filter((r) => r.status === col.id);
              const isNextForDragged = dragged ? LEGAL_DROPS[dragged.status] === col.id : false;
              return (
                <BoardColumn key={col.id} column={col} items={colItems} highlight={isNextForDragged}>
                  {colItems.map((r) => (
                    <DraggableRequestCard
                      key={r.id}
                      request={r}
                      canDrag={canDrag}
                      onAssign={setAssigning}
                      onReject={setRejecting}
                      onResolve={setResolving}
                    />
                  ))}
                  {colItems.length === 0 && (
                    <p className="py-6 text-center text-xs text-muted">No requests</p>
                  )}
                </BoardColumn>
              );
            })}
          </div>

          <DragOverlay dropAnimation={{ duration: 180 }}>
            {dragged ? (
              <div className="rotate-2 scale-[1.03] shadow-2xl ring-2 ring-primary/30">
                <RequestCard request={dragged} onAssign={() => {}} onReject={() => {}} onResolve={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <AssignTechnicianModal
        request={assigning}
        onClose={() => {
          if (assigning) clearOverride(assigning.id);
          setAssigning(null);
        }}
      />
      <RejectModal request={rejecting} onClose={() => setRejecting(null)} />
      <ResolveModal
        request={resolving}
        onClose={() => {
          if (resolving) clearOverride(resolving.id);
          setResolving(null);
        }}
      />
    </>
  );
}

export default MaintenanceBoard;
