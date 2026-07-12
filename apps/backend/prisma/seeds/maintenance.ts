// AssetFlow seed — Module 7 maintenance requests. Idempotent (skips an asset
// that already has any maintenance request row).

import { AssetStatus, MaintenancePriority, MaintenanceRequestStatus, PrismaClient } from '@prisma/client';

export async function seedMaintenance(prisma: PrismaClient) {
  const maya = await prisma.user.findUnique({ where: { email: 'maya.manager@assetflow.com' } });
  const raj = await prisma.user.findUnique({ where: { email: 'raj.head@assetflow.com' } });
  const sam = await prisma.user.findUnique({ where: { email: 'sam.emp@assetflow.com' } });
  const omar = await prisma.user.findUnique({ where: { email: 'omar.emp@assetflow.com' } });
  if (!maya || !raj || !sam || !omar) return;

  const monitor = await prisma.asset.findFirst({ where: { name: 'Dell 24" Monitor' } });
  const projector = await prisma.asset.findFirst({ where: { name: 'BenQ Projector M2' } });
  const chair = await prisma.asset.findFirst({ where: { name: 'Office Chair - Ergo' } });

  const hasOpenOrAny = async (assetId: number) =>
    prisma.maintenanceRequest.findFirst({ where: { assetId } });

  if (monitor && !(await hasOpenOrAny(monitor.id))) {
    // PENDING, HIGH priority — the seeded demo request.
    await prisma.maintenanceRequest.create({
      data: {
        assetId: monitor.id,
        requestedById: omar.id,
        issue: 'Screen broken',
        description: 'Cracked panel, half the display is dead',
        priority: MaintenancePriority.HIGH,
        status: MaintenanceRequestStatus.PENDING,
      },
    });
  }

  if (projector && !(await hasOpenOrAny(projector.id))) {
    // IN_PROGRESS — asset seeded UNDER_MAINTENANCE with prevAssetStatus recorded.
    await prisma.maintenanceRequest.create({
      data: {
        assetId: projector.id,
        requestedById: sam.id,
        issue: 'No signal from HDMI input',
        description: 'Projector powers on but shows no signal',
        priority: MaintenancePriority.MEDIUM,
        status: MaintenanceRequestStatus.IN_PROGRESS,
        approvedById: maya.id,
        approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        technicianId: raj.id,
        assignedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        startedAt: new Date(),
        prevAssetStatus: AssetStatus.AVAILABLE,
      },
    });
    await prisma.asset.update({ where: { id: projector.id }, data: { status: AssetStatus.UNDER_MAINTENANCE } });
  }

  if (chair && !(await hasOpenOrAny(chair.id))) {
    // RESOLVED — closed-out history row with notes + cost.
    await prisma.maintenanceRequest.create({
      data: {
        assetId: chair.id,
        requestedById: sam.id,
        issue: 'Wheel came loose',
        priority: MaintenancePriority.LOW,
        status: MaintenanceRequestStatus.RESOLVED,
        approvedById: maya.id,
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        technicianId: raj.id,
        assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        resolvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        resolutionNotes: 'Tightened caster wheel, no further issue',
        cost: 5,
        prevAssetStatus: AssetStatus.AVAILABLE,
      },
    });
  }

  console.log('   Maintenance seeded');
}
