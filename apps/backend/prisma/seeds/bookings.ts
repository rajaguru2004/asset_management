// AssetFlow seed — Module 6 bookings. Idempotent (skips if a booking with the
// same asset+purpose already exists). Seeds the PDF demo slot on Room A
// (today 9-10 CONFIRMED) plus a completed and a pre-rejected conflict.

import { BookingStatus, PrismaClient } from '@prisma/client';

export async function seedBookings(prisma: PrismaClient) {
  const roomA = await prisma.asset.findFirst({ where: { name: 'Meeting Room A' } });
  const sam = await prisma.user.findUnique({ where: { email: 'sam.emp@assetflow.com' } });
  const nina = await prisma.user.findUnique({ where: { email: 'nina.emp@assetflow.com' } });
  if (!roomA || !sam || !nina) return;

  const exists = await prisma.booking.findFirst({ where: { assetId: roomA.id } });
  if (exists) return;

  const today = new Date();
  const at = (h: number, m = 0) => {
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const yesterday = (h: number, m = 0) => {
    const d = at(h, m);
    d.setDate(d.getDate() - 1);
    return d;
  };

  // The PDF demo slot: Room A today 9-10, CONFIRMED.
  await prisma.booking.create({
    data: {
      assetId: roomA.id,
      bookedById: sam.id,
      purpose: 'Sprint planning',
      startTime: at(9),
      endTime: at(10),
      status: BookingStatus.CONFIRMED,
    },
  });

  // Completed booking from yesterday.
  await prisma.booking.create({
    data: {
      assetId: roomA.id,
      bookedById: nina.id,
      purpose: 'Client demo',
      startTime: yesterday(14),
      endTime: yesterday(15),
      status: BookingStatus.COMPLETED,
    },
  });

  // Pre-rejected conflict — visible in the UI as a REJECTED row.
  await prisma.booking.create({
    data: {
      assetId: roomA.id,
      bookedById: nina.id,
      purpose: 'Overlaps sprint planning',
      startTime: at(9, 30),
      endTime: at(10, 30),
      status: BookingStatus.REJECTED,
      cancelReason: 'Conflicts with an existing confirmed booking',
    },
  });

  console.log('   Bookings seeded');
}
