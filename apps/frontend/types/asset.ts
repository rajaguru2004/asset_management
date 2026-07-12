// Asset + Category domain types matching the backend contract.

export type AssetStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'UNDER_MAINTENANCE'
  | 'RETIRED'
  | 'LOST';

export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  description?: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  condition: AssetCondition;
  location?: string | null;
  purchaseCost?: number | null;
  categoryId?: string | null;
  category?: { name: string } | null;
  vendorId?: string | null;
}

export interface CreateAssetDto {
  assetTag: string;
  name: string;
  description?: string;
  serialNumber?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  location?: string;
  purchaseCost?: number;
  categoryId?: string;
  vendorId?: string;
}

export type UpdateAssetDto = Partial<CreateAssetDto>;

export interface CreateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateCategoryDto = Partial<CreateCategoryDto>;
