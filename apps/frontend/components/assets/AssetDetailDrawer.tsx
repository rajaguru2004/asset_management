'use client';

import { Boxes, MapPin, Wrench } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { LoadingRows } from '@/components/common/Spinner';
import { useAsset } from '@/hooks/useAssets';

const STATUS_BADGE: Record<string, BadgeVariant> = {
  AVAILABLE: 'success',
  ALLOCATED: 'info',
  RESERVED: 'warning',
  UNDER_MAINTENANCE: 'warning',
  LOST: 'danger',
  RETIRED: 'neutral',
  DISPOSED: 'neutral',
};

export function AssetDetailDrawer({
  assetId,
  onClose,
}: {
  assetId: number | null;
  onClose: () => void;
}) {
  const { data: asset, isLoading } = useAsset(assetId);
  const holder = asset?.allocations?.[0];

  return (
    <Modal
      open={assetId != null}
      onClose={onClose}
      title={asset ? `${asset.assetTag} — ${asset.name}` : 'Asset'}
      className="max-w-xl"
    >
      {isLoading || !asset ? (
        <LoadingRows />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_BADGE[asset.status] ?? 'neutral'}>
              {asset.status.replace('_', ' ')}
            </Badge>
            <Badge variant="neutral">{asset.condition}</Badge>
            {asset.isShared && <Badge variant="info">Shared / bookable</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase text-muted">Category</p>
              <p className="text-foreground">{asset.category.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Serial number</p>
              <p className="text-foreground">{asset.serialNumber ?? '—'}</p>
            </div>
            <div>
              <p className="flex items-center gap-1 text-xs font-medium uppercase text-muted">
                <MapPin className="h-3 w-3" /> Location
              </p>
              <p className="text-foreground">{asset.location || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-muted">Acquisition cost</p>
              <p className="text-foreground">{asset.acquisitionCost ?? '—'}</p>
            </div>
          </div>

          {Object.keys(asset.customValues ?? {}).length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted">Category details</p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3 text-sm">
                {Object.entries(asset.customValues).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-muted">{key}: </span>
                    <span className="text-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-muted">
              <Boxes className="h-3.5 w-3.5" /> Current holder
            </p>
            {holder ? (
              <p className="text-sm text-foreground">
                {holder.user ? `${holder.user.firstName} ${holder.user.lastName}` : holder.department?.name}
                {holder.expectedReturnDate && (
                  <span className="text-muted">
                    {' '}
                    · due back {new Date(holder.expectedReturnDate).toLocaleDateString()}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted">Unassigned</p>
            )}
          </div>

          {asset.maintenance.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-muted">
                <Wrench className="h-3.5 w-3.5" /> Recent maintenance
              </p>
              <ul className="space-y-1.5 text-sm">
                {asset.maintenance.map((m) => (
                  <li key={m.id} className="flex items-center justify-between">
                    <span className="text-foreground">{m.issue}</span>
                    <Badge variant="neutral">{m.status.replace('_', ' ')}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default AssetDetailDrawer;
