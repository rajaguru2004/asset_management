'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { CHART_TOOLTIP_STYLE } from '@/theme';
import type { DashboardAnalytics } from '@/types/organization';

type CatRow = DashboardAnalytics['categoryBreakdown'][number];

/** Column chart: overdue returns per asset category, with total assets for scale. */
export function OverdueByCategoryChart({ data }: { data: DashboardAnalytics['categoryBreakdown'] }) {
  const router = useRouter();
  const rows = useMemo(() => data.filter((c) => c.totalAssets > 0), [data]);
  const hasOverdue = rows.some((r) => r.overdueReturns > 0);

  const drill = (row?: CatRow) => {
    if (!row) return;
    router.push(`/allocations?overdue=true&categoryId=${row.categoryId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overdue returns by category</CardTitle>
        <p className="text-xs text-muted">Click a column to open the overdue allocations for that category.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No assets yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: 'var(--muted-bg)', opacity: 0.5 }}
                />
                <Legend formatter={(v) => <span className="text-xs text-muted">{v}</span>} />
                <Bar
                  dataKey="totalAssets"
                  name="Total assets"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const row = (entry as { payload?: CatRow })?.payload;
                    if (row) router.push(`/assets?categoryId=${row.categoryId}`);
                  }}
                />
                <Bar
                  dataKey="overdueReturns"
                  name="Overdue returns"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(entry: unknown) => drill((entry as { payload?: CatRow })?.payload)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {!hasOverdue && rows.length > 0 && (
          <p className="mt-2 text-center text-xs text-muted">No overdue returns right now — all clear.</p>
        )}
      </CardContent>
    </Card>
  );
}

export default OverdueByCategoryChart;
