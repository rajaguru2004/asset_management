'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Building2, Layers, ShieldCheck, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useDashboard } from '@/hooks/useDashboard';
import { StatCard } from '@/components/common/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingRows } from '@/components/common/Spinner';
import { roleName } from '@/lib/permissions';
import { CHART_COLORS } from '@/theme';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useDashboard();

  const roleData = data
    ? Object.entries(data.employeesByRole)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          Welcome back{user ? `, ${user.firstName}` : ''} 👋
        </h2>
        <p className="mt-1 text-sm text-muted">
          A real-time snapshot of your organization setup.
        </p>
      </div>

      {isLoading || !data ? (
        <Card>
          <LoadingRows label="Loading dashboard…" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Active Employees" value={data.totalEmployees} accent="primary" />
            <StatCard icon={Building2} label="Departments" value={data.totalDepartments} accent="info" />
            <StatCard icon={Layers} label="Asset Categories" value={data.activeCategories} accent="success" />
            <StatCard
              icon={ShieldCheck}
              label="Department Heads"
              value={data.employeesByRole['Department Head'] ?? 0}
              accent="warning"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Team by role</CardTitle>
              </CardHeader>
              <CardContent>
                {roleData.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted">No employees yet.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={roleData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {roleData.map((entry, i) => (
                            <Cell key={entry.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            fontSize: 13,
                            color: 'var(--foreground)',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          formatter={(v) => <span className="text-xs text-muted">{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Recently added employees</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="divide-y divide-border">
                  {data.recentlyAdded.map((u) => (
                    <li key={u.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold text-foreground">
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate text-xs text-muted">{u.email}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="default">{roleName(u.roleId)}</Badge>
                        {u.department && (
                          <span className="text-xs text-muted">{u.department.code}</span>
                        )}
                      </div>
                    </li>
                  ))}
                  {data.recentlyAdded.length === 0 && (
                    <li className="py-8 text-center text-sm text-muted">No employees yet.</li>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
