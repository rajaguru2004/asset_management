import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import type { MaintenancePriority } from '@/types/maintenance';

const VARIANT: Record<MaintenancePriority, BadgeVariant> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'danger',
};

export function PriorityBadge({ priority }: { priority: MaintenancePriority }) {
  return <Badge variant={VARIANT[priority]}>{priority}</Badge>;
}

export default PriorityBadge;
