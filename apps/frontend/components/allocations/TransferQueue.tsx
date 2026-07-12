'use client';

import { toast } from 'sonner';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { usePendingTransfers, useAllocationMutations } from '@/hooks/useAllocations';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingRows } from '@/components/common/Spinner';
import { getErrorMessage } from '@/lib/apiError';

export function TransferQueue() {
  const { data: pending, isLoading } = usePendingTransfers();
  const { approveTransfer, rejectTransfer } = useAllocationMutations();

  const approve = async (id: number, name: string) => {
    try {
      await approveTransfer.mutateAsync(id);
      toast.success(`Transfer approved — ${name} reassigned`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not approve transfer'));
    }
  };

  const reject = async (id: number) => {
    try {
      await rejectTransfer.mutateAsync(id);
      toast.success('Transfer request rejected');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not reject transfer'));
    }
  };

  return (
    <Card>
      {isLoading ? (
        <LoadingRows />
      ) : !pending || pending.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No pending transfers"
          description="Requests employees raise from a blocked allocation show up here."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Asset</TH>
              <TH>Requested by</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <TBody>
            {pending.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Badge variant="neutral" className="font-mono">
                    {p.asset.assetTag}
                  </Badge>{' '}
                  <span className="text-foreground">{p.asset.name}</span>
                </TD>
                <TD className="text-muted">{p.user ? `${p.user.firstName} ${p.user.lastName}` : '—'}</TD>
                <TD>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reject(p.id)}
                      disabled={rejectTransfer.isPending}
                    >
                      <X className="h-4 w-4" /> Reject
                    </Button>
                    <Button size="sm" onClick={() => approve(p.id, p.asset.name)} isLoading={approveTransfer.isPending}>
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                  </div>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

export default TransferQueue;
