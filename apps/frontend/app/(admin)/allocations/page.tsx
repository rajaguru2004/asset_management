'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Clock3 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Action, Resource, hasPermission } from '@/lib/permissions';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { AllocationTable } from '@/components/allocations/AllocationTable';
import { TransferQueue } from '@/components/allocations/TransferQueue';
import { usePendingTransfers } from '@/hooks/useAllocations';

export default function AllocationsPage() {
  const roleId = useAuthStore((s) => s.user?.roleId);
  const { data: pending } = usePendingTransfers();
  const canManage = hasPermission(roleId, Resource.ALLOCATIONS, Action.UPDATE);

  const tabs = useMemo<TabItem[]>(() => {
    const t: TabItem[] = [{ id: 'allocations', label: 'Allocations', icon: ArrowLeftRight }];
    if (canManage) {
      t.push({ id: 'transfers', label: 'Pending Transfers', icon: Clock3, count: pending?.length ?? 0 });
    }
    return t;
  }, [canManage, pending]);

  const [active, setActive] = useState('allocations');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Allocations</h2>
        <p className="mt-1 text-sm text-muted">
          Chain of custody — who holds what, transfer approvals, overdue returns.
        </p>
      </div>

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      <div className="pt-1">
        {active === 'allocations' && <AllocationTable />}
        {active === 'transfers' && canManage && <TransferQueue />}
      </div>
    </div>
  );
}
