'use client';

import { Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import { LoadingRows } from '@/components/common/Spinner';
import { Button } from '@/components/ui/Button';
import { PermissionGate } from '@/components/common/PermissionGate';
import { MaintenanceBoard } from '@/components/maintenance/MaintenanceBoard';
import { RequestForm } from '@/components/maintenance/RequestForm';
import { Action, Resource } from '@/lib/permissions';

export default function MaintenancePage() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Maintenance</h2>
          <p className="mt-1 text-sm text-muted">
            Repairs routed through approval — asset availability reacts automatically.
          </p>
        </div>
        <PermissionGate resource={Resource.MAINTENANCE} action={Action.CREATE}>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Raise request
          </Button>
        </PermissionGate>
      </div>

      <Suspense fallback={<LoadingRows />}>
        <MaintenanceBoard />
      </Suspense>

      <RequestForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
