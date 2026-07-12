'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CalendarClock,
  Clock3,
  Layers,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDashboard, useDashboardAnalytics } from '@/hooks/useDashboard';
import { StatCard } from '@/components/common/StatCard';
import { Card } from '@/components/ui/Card';
import { LoadingRows } from '@/components/common/Spinner';
import { AssetWaterfallChart } from '@/components/dashboard/AssetWaterfallChart';
import { OverdueByCategoryChart } from '@/components/dashboard/OverdueByCategoryChart';
import { AssetsByCategoryChart } from '@/components/dashboard/AssetsByCategoryChart';
import { TeamRoleChart } from '@/components/dashboard/TeamRoleChart';
import { MaintenanceLogTable } from '@/components/dashboard/MaintenanceLogTable';
import { DashboardBookingsCalendar } from '@/components/dashboard/DashboardBookingsCalendar';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { data, isLoading } = useDashboard();
  const { data: analytics } = useDashboardAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''} 👋
        </h2>
        <p className="mt-1 text-sm text-muted">
          A real-time snapshot of your organization — click any card or chart to dive in.
        </p>
      </div>

      {isLoading || !data ? (
        <Card>
          <LoadingRows label="Loading dashboard…" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Layers}
              label="Asset Categories"
              value={data.activeCategories}
              accent="success"
              onClick={() => router.push('/organization?tab=categories')}
            />
            <StatCard
              icon={Boxes}
              label="Available Assets"
              value={data.availableAssets}
              accent="success"
              onClick={() => router.push('/assets?status=AVAILABLE')}
            />
            <StatCard
              icon={ArrowLeftRight}
              label="Allocated Assets"
              value={data.allocatedAssets}
              accent="info"
              onClick={() => router.push('/assets?status=ALLOCATED')}
            />
            <StatCard
              icon={Clock3}
              label="Overdue Returns"
              value={data.overdueReturns}
              accent="warning"
              hint={data.pendingTransfers > 0 ? `${data.pendingTransfers} pending transfer(s)` : undefined}
              onClick={() => router.push('/allocations?overdue=true')}
            />
            <StatCard
              icon={Wrench}
              label="Maintenance Today"
              value={data.maintenanceToday}
              accent="warning"
              hint={`${data.pendingMaintenance} pending approval`}
              onClick={() => router.push('/assets?status=UNDER_MAINTENANCE')}
            />
            <StatCard
              icon={CalendarClock}
              label="Active Bookings"
              value={data.activeBookings}
              accent="primary"
              onClick={() => router.push('/bookings')}
            />
            <StatCard
              icon={Building2}
              label="Departments"
              value={data.totalDepartments}
              accent="info"
              onClick={() => router.push('/organization?tab=departments')}
            />
          </div>

          {analytics && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <AssetWaterfallChart data={analytics.assetsByStatus} />
              <OverdueByCategoryChart data={analytics.categoryBreakdown} />
              <AssetsByCategoryChart data={analytics.categoryBreakdown} />
              <TeamRoleChart employeesByRole={data.employeesByRole} />
            </div>
          )}

          <MaintenanceLogTable />

          <DashboardBookingsCalendar />
        </>
      )}
    </div>
  );
}
