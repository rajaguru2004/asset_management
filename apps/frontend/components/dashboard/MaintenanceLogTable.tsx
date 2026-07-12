'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMaintenanceRequests } from '@/hooks/useMaintenance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PriorityBadge } from '@/components/maintenance/PriorityBadge';
import { LoadingRows } from '@/components/common/Spinner';
import type { MaintenanceRequestStatus } from '@/types/maintenance';

const STATUS_BADGE: Record<MaintenanceRequestStatus, BadgeVariant> = {
  PENDING: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  TECHNICIAN_ASSIGNED: 'default',
  IN_PROGRESS: 'default',
  RESOLVED: 'success',
  CANCELLED: 'neutral',
};

const STATUS_OPTIONS = (Object.keys(STATUS_BADGE) as MaintenanceRequestStatus[]).map((s) => ({
  value: s,
  label: s.replaceAll('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()),
}));

/** Dashboard maintenance log: filter by date range + status, row click drills into the board. */
export function MaintenanceLogTable() {
  const router = useRouter();
  const { data, isLoading } = useMaintenanceRequests({ limit: 100 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<MaintenanceRequestStatus | ''>('');

  const rows = useMemo(() => {
    let items = data?.items ?? [];
    if (from) items = items.filter((r) => r.createdAt.slice(0, 10) >= from);
    if (to) items = items.filter((r) => r.createdAt.slice(0, 10) <= to);
    if (status) items = items.filter((r) => r.status === status);
    return items;
  }, [data, from, to, status]);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
        <div>
          <CardTitle>Maintenance log</CardTitle>
          <p className="text-xs text-muted">Filter by date or status — click a row to open the board.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-36">
            <Input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="w-36">
            <Input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="w-40">
            <Select
              aria-label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as MaintenanceRequestStatus | '')}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No maintenance requests match the filters.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Asset</TH>
                <TH>Issue</TH>
                <TH>Priority</TH>
                <TH>Status</TH>
                <TH>Technician</TH>
              </TR>
            </THead>
            <TBody>
              {rows.slice(0, 8).map((r) => (
                <TR
                  key={r.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/maintenance?status=${r.status}`)}
                >
                  <TD className="whitespace-nowrap text-muted">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </TD>
                  <TD>
                    <span className="font-mono text-xs text-muted">{r.asset.assetTag}</span>{' '}
                    <span className="text-sm">{r.asset.name}</span>
                  </TD>
                  <TD className="max-w-56 truncate">{r.issue}</TD>
                  <TD>
                    <PriorityBadge priority={r.priority} />
                  </TD>
                  <TD>
                    <Badge variant={STATUS_BADGE[r.status]}>
                      {r.status.replaceAll('_', ' ')}
                    </Badge>
                  </TD>
                  <TD className="text-muted">
                    {r.technician ? `${r.technician.firstName} ${r.technician.lastName}` : '—'}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
        {rows.length > 8 && (
          <p className="mt-2 text-right text-xs text-muted">
            Showing 8 of {rows.length} — open the board for the rest.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default MaintenanceLogTable;
