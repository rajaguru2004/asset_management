import { Injectable } from '@nestjs/common';
import { AllocationStatus, AssetStatus, BookingStatus, MaintenanceRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SAFE_SELECT } from '../common/selects/user.select';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      totalDepartments,
      activeCategories,
      roles,
      grouped,
      recentlyAdded,
      // --- Module 4-7 KPIs ---
      availableAssets,
      allocatedAssets,
      overdueReturns,
      pendingTransfers,
      activeBookings,
      bookingsToday,
      maintenanceToday,
      pendingMaintenance,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.department.count({ where: { isActive: true } }),
      this.prisma.assetCategory.count({ where: { isActive: true } }),
      this.prisma.roleMaster.findMany({
        select: { id: true, roleName: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.groupBy({
        by: ['roleId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: USER_SAFE_SELECT,
      }),
      this.prisma.asset.count({ where: { status: AssetStatus.AVAILABLE, isActive: true } }),
      this.prisma.asset.count({ where: { status: AssetStatus.ALLOCATED, isActive: true } }),
      this.prisma.assetAllocation.count({
        where: { status: AllocationStatus.ACTIVE, expectedReturnDate: { lt: new Date() } },
      }),
      this.prisma.assetAllocation.count({ where: { status: AllocationStatus.TRANSFER_PENDING } }),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.booking.count({
        where: { status: BookingStatus.CONFIRMED, startTime: { gte: todayStart, lte: todayEnd } },
      }),
      this.prisma.asset.count({ where: { status: AssetStatus.UNDER_MAINTENANCE, isActive: true } }),
      this.prisma.maintenanceRequest.count({ where: { status: MaintenanceRequestStatus.PENDING } }),
    ]);

    const countByRoleId = new Map<number, number>(
      grouped.map((g) => [g.roleId, g._count._all]),
    );
    const employeesByRole: Record<string, number> = {};
    for (const r of roles) {
      employeesByRole[r.roleName] = countByRoleId.get(r.id) ?? 0;
    }

    return {
      totalEmployees,
      totalDepartments,
      activeCategories,
      employeesByRole,
      recentlyAdded,
      availableAssets,
      allocatedAssets,
      overdueReturns,
      pendingTransfers,
      activeBookings,
      bookingsToday,
      maintenanceToday,
      pendingMaintenance,
    };
  }

  async analytics() {
    const [byStatus, byCategory, categories, overdueAllocs] = await Promise.all([
      this.prisma.asset.groupBy({
        by: ['status'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.asset.groupBy({
        by: ['categoryId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.assetCategory.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      // groupBy cannot traverse relations, so category comes via a narrow findMany + reduce
      this.prisma.assetAllocation.findMany({
        where: { status: AllocationStatus.ACTIVE, expectedReturnDate: { lt: new Date() } },
        select: { asset: { select: { categoryId: true } } },
      }),
    ]);

    const totalByCat = new Map<number, number>(byCategory.map((g) => [g.categoryId, g._count._all]));
    const overdueByCat = new Map<number, number>();
    for (const a of overdueAllocs) {
      overdueByCat.set(a.asset.categoryId, (overdueByCat.get(a.asset.categoryId) ?? 0) + 1);
    }

    return {
      assetsByStatus: byStatus.map((g) => ({ status: g.status, count: g._count._all })),
      categoryBreakdown: categories.map((c) => ({
        categoryId: c.id,
        name: c.name,
        totalAssets: totalByCat.get(c.id) ?? 0,
        overdueReturns: overdueByCat.get(c.id) ?? 0,
      })),
    };
  }
}
