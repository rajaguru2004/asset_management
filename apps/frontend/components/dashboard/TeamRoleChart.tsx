'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  CHART_COLORS,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/theme';

/** Horizontal bar: employee count per role. */
export function TeamRoleChart({ employeesByRole }: { employeesByRole: Record<string, number> }) {
  const router = useRouter();
  const rows = useMemo(
    () =>
      Object.entries(employeesByRole)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value })),
    [employeesByRole],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team by role</CardTitle>
        <p className="text-xs text-muted">Click a bar to open the employee directory.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No employees yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  cursor={{ fill: 'var(--muted-bg)', opacity: 0.5 }}
                />
                <Bar
                  dataKey="value"
                  name="Employees"
                  fill={CHART_COLORS[0]}
                  radius={[0, 4, 4, 0]}
                  barSize={22}
                  cursor="pointer"
                  onClick={() => router.push('/organization?tab=employees')}
                  label={{ position: 'right', fill: 'var(--muted)', fontSize: 12 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamRoleChart;
