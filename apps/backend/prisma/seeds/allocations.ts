// AssetFlow seed — Module 5 allocations. Idempotent: skips an asset that already
// has an ACTIVE/RETURNED row, and a user that already has a pending transfer
// request on an asset, so re-runs don't duplicate.

import { AllocationStatus, AssetStatus, PrismaClient } from '@prisma/client';

export async function seedAllocations(prisma: PrismaClient) {
  const tony = await prisma.user.findUnique({ where: { email: 'sam.emp@assetflow.com' } });
  const nina = await prisma.user.findUnique({ where: { email: 'nina.emp@assetflow.com' } });
  const maya = await prisma.user.findUnique({ where: { email: 'maya.manager@assetflow.com' } });
  const itDept = await prisma.department.findUnique({ where: { code: 'IT' } });
  if (!tony || !nina || !maya || !itDept) return;

  const laptop1 = await prisma.asset.findFirst({ where: { name: 'Dell Latitude 5420' } });
  const laptop2 = await prisma.asset.findFirst({ where: { name: 'HP EliteBook 840' } });
  const monitor = await prisma.asset.findFirst({ where: { name: 'Dell 24" Monitor' } });

  const requestTransfer = async (assetId: number, userId: number) => {
    const exists = await prisma.assetAllocation.findFirst({
      where: { assetId, userId, status: AllocationStatus.TRANSFER_PENDING },
    });
    if (exists) return;
    await prisma.assetAllocation.create({
      data: {
        assetId,
        userId,
        allocatedById: userId,
        status: AllocationStatus.TRANSFER_PENDING,
        notes: 'Seed: pending transfer request',
      },
    });
  };

  const allocate = async (
    assetId: number,
    target: { userId?: number; departmentId?: number },
    opts: { expectedReturnDate?: Date; returned?: boolean } = {},
  ) => {
    const already = await prisma.assetAllocation.findFirst({
      where: { assetId, status: { in: [AllocationStatus.ACTIVE, AllocationStatus.RETURNED] } },
    });
    if (already) return;

    await prisma.assetAllocation.create({
      data: {
        assetId,
        userId: target.userId,
        departmentId: target.departmentId,
        allocatedById: maya.id,
        status: opts.returned ? AllocationStatus.RETURNED : AllocationStatus.ACTIVE,
        expectedReturnDate: opts.expectedReturnDate,
        returnedAt: opts.returned ? new Date() : null,
        returnCondition: opts.returned ? 'GOOD' : null,
      },
    });
    if (!opts.returned) {
      await prisma.asset.update({ where: { id: assetId }, data: { status: AssetStatus.ALLOCATED } });
    }
  };

  if (laptop1) {
    // Active, held by Sam — 5-day-overdue expected return (seed's "today" reference).
    await allocate(
      laptop1.id,
      { userId: tony.id },
      { expectedReturnDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    );
  }
  if (laptop2) {
    // Active, departmental hold — IT.
    await allocate(laptop2.id, { departmentId: itDept.id });
  }
  if (monitor) {
    // Returned history row.
    await allocate(monitor.id, { userId: nina.id }, { returned: true });
  }
  if (laptop1) {
    // Nina requests a transfer of the laptop Sam is holding — powers the
    // Pending Transfers queue demo.
    await requestTransfer(laptop1.id, nina.id);
  }

  console.log('   Allocations seeded');
}
