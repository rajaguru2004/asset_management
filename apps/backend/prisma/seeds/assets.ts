// AssetFlow seed — Module 4 asset registry. Idempotent (findFirst-or-create,
// mirrors AssetsService's own atomic tag-sequence logic so the counters stay
// consistent with assets created later through the API).

import { AssetCondition, Prisma, PrismaClient } from '@prisma/client';

interface AssetSeed {
  categoryName: string;
  tagPrefix: string;
  name: string;
  serialNumber?: string;
  condition?: AssetCondition;
  location?: string;
  isShared?: boolean;
  acquisitionCost?: number;
  customValues?: Record<string, unknown>;
}

export async function seedAssets(prisma: PrismaClient) {
  const meetingRooms = await prisma.assetCategory.upsert({
    where: { name: 'Meeting Rooms' },
    update: {},
    create: {
      name: 'Meeting Rooms',
      tagPrefix: 'MTG',
      sortOrder: 5,
      description: 'Bookable meeting spaces',
      customFields: [] as unknown as Prisma.InputJsonValue,
    },
  });

  const categoryIds = new Map<string, number>([['Meeting Rooms', meetingRooms.id]]);
  for (const name of ['Electronics', 'Furniture', 'Vehicles', 'Projectors']) {
    const cat = await prisma.assetCategory.findUnique({ where: { name } });
    if (cat) categoryIds.set(name, cat.id);
  }

  const items: AssetSeed[] = [
    { categoryName: 'Electronics', tagPrefix: 'ELEC', name: 'Dell Latitude 5420', serialNumber: 'SN-EL-001', location: 'CHN', acquisitionCost: 899.99, customValues: { warrantyPeriod: 24, serialNumber: 'SN-EL-001' } },
    { categoryName: 'Electronics', tagPrefix: 'ELEC', name: 'HP EliteBook 840', serialNumber: 'SN-EL-002', location: 'CHN', acquisitionCost: 950, customValues: { warrantyPeriod: 24, serialNumber: 'SN-EL-002' } },
    { categoryName: 'Electronics', tagPrefix: 'ELEC', name: 'Dell 24" Monitor', serialNumber: 'SN-EL-003', location: 'CBE', acquisitionCost: 210, customValues: { warrantyPeriod: 12, serialNumber: 'SN-EL-003' } },
    { categoryName: 'Electronics', tagPrefix: 'ELEC', name: 'iPhone 13', serialNumber: 'SN-EL-004', location: 'CHN', acquisitionCost: 699, customValues: { warrantyPeriod: 12, serialNumber: 'SN-EL-004' } },
    { categoryName: 'Furniture', tagPrefix: 'FURN', name: 'Office Chair - Ergo', location: 'CHN', acquisitionCost: 180 },
    { categoryName: 'Furniture', tagPrefix: 'FURN', name: 'Standing Desk', location: 'CBE', acquisitionCost: 320 },
    { categoryName: 'Vehicles', tagPrefix: 'VEH', name: 'Toyota Innova', serialNumber: 'CH-INNOVA-01', location: 'CHN', acquisitionCost: 24000, customValues: { plateNumber: 'TN-01-AB-1234', fuelType: 'Diesel' } },
    { categoryName: 'Vehicles', tagPrefix: 'VEH', name: 'Honda Activa', serialNumber: 'CH-ACTIVA-01', location: 'CBE', acquisitionCost: 1200, customValues: { plateNumber: 'TN-01-CD-5678', fuelType: 'Petrol' } },
    { categoryName: 'Projectors', tagPrefix: 'PROJ', name: 'Epson Projector X1', location: 'CHN', isShared: true, acquisitionCost: 650, customValues: { lumens: 3000 } },
    { categoryName: 'Projectors', tagPrefix: 'PROJ', name: 'BenQ Projector M2', location: 'CBE', acquisitionCost: 580, customValues: { lumens: 2800 } },
    { categoryName: 'Meeting Rooms', tagPrefix: 'MTG', name: 'Meeting Room A', location: 'CHN', isShared: true },
    { categoryName: 'Meeting Rooms', tagPrefix: 'MTG', name: 'Meeting Room B', location: 'CHN', isShared: true },
  ];

  for (const item of items) {
    const categoryId = categoryIds.get(item.categoryName);
    if (!categoryId) continue;

    const existing = await prisma.asset.findFirst({ where: { name: item.name, categoryId } });
    if (existing) continue;

    const seq = await prisma.assetTagSequence.upsert({
      where: { categoryId },
      update: { lastNumber: { increment: 1 } },
      create: { categoryId, lastNumber: 1 },
    });
    const assetTag = `${item.tagPrefix}-${String(seq.lastNumber).padStart(4, '0')}`;

    await prisma.asset.create({
      data: {
        assetTag,
        name: item.name,
        categoryId,
        serialNumber: item.serialNumber,
        condition: item.condition ?? AssetCondition.GOOD,
        location: item.location ?? '',
        isShared: item.isShared ?? false,
        acquisitionCost: item.acquisitionCost,
        customValues: (item.customValues ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  console.log('   Assets seeded');
}
