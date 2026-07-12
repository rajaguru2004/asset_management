// AssetFlow seed — Module 4-7 library vocabularies. Idempotent (upsert).

import { Prisma, PrismaClient } from '@prisma/client';

export async function seedLibraries(prisma: PrismaClient) {
  const item = (libName: string, dataId: string, data: Record<string, unknown>) =>
    prisma.libraryItem.upsert({
      where: { libName_dataId: { libName, dataId } },
      update: { data: data as Prisma.InputJsonValue },
      create: { libName, dataId, data: data as Prisma.InputJsonValue },
    });

  await item('location', 'CHN', { label: 'Chennai' });
  await item('location', 'CBE', { label: 'Coimbatore' });

  await item('fuel_type', 'PET', { label: 'Petrol' });
  await item('fuel_type', 'DSL', { label: 'Diesel' });
  await item('fuel_type', 'EV', { label: 'Electric' });

  await item('booking_purpose', 'MEETING', { label: 'Meeting' });
  await item('booking_purpose', 'CLIENT_VISIT', { label: 'Client Visit' });
  await item('booking_purpose', 'TRAINING', { label: 'Training' });

  await item('maintenance_type', 'REPAIR', { label: 'Repair' });
  await item('maintenance_type', 'PREVENTIVE', { label: 'Preventive Service' });
  await item('maintenance_type', 'INSPECTION', { label: 'Inspection' });

  console.log('   Libraries seeded');
}
