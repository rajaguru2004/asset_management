import { Suspense } from 'react';
import { AssetTable } from '@/components/assets/AssetTable';
import { LoadingRows } from '@/components/common/Spinner';

export default function AssetsPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <AssetTable />
    </Suspense>
  );
}
