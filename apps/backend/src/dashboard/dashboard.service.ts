import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { USER_SAFE_SELECT } from '../common/selects/user.select';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const [
      totalEmployees,
      totalDepartments,
      activeCategories,
      roles,
      grouped,
      recentlyAdded,
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
    };
  }
}
