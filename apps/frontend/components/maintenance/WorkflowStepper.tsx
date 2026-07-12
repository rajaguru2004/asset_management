import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MaintenanceRequestStatus } from '@/types/maintenance';

const STEPS: { id: MaintenanceRequestStatus; label: string }[] = [
  { id: 'PENDING', label: 'Pending' },
  { id: 'APPROVED', label: 'Approved' },
  { id: 'TECHNICIAN_ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export function WorkflowStepper({ status }: { status: MaintenanceRequestStatus }) {
  if (status === 'REJECTED' || status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 text-sm text-danger">
        <X className="h-4 w-4" /> {status === 'REJECTED' ? 'Rejected' : 'Cancelled'}
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.id === status);
  const isResolved = status === 'RESOLVED';

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const complete = i < currentIndex || (i === currentIndex && isResolved);
        const active = i === currentIndex && !isResolved;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-semibold',
                  complete
                    ? 'border-primary bg-primary text-primary-foreground'
                    : active
                      ? 'border-primary text-primary'
                      : 'border-border bg-card text-muted',
                )}
              >
                {complete ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={cn('whitespace-nowrap text-[10px]', active ? 'font-medium text-foreground' : 'text-muted')}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('mx-1 h-0.5 w-6 sm:w-10', i < currentIndex ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default WorkflowStepper;
