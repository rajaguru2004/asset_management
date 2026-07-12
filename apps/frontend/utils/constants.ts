import type { AssetStatus, AssetCondition } from '@/types/asset';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const APP_NAME = 'Asset Management System';

interface Option<T> {
  value: T;
  label: string;
}

export const ASSET_STATUSES: Option<AssetStatus>[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST', label: 'Lost' },
];

export const ASSET_CONDITIONS: Option<AssetCondition>[] = [
  { value: 'NEW', label: 'New' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'DAMAGED', label: 'Damaged' },
];
