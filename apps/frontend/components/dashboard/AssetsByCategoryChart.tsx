'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  CHART_COLORS,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from '@/theme';
import type { DashboardAnalytics } from '@/types/organization';

type CatRow = DashboardAnalytics['categoryBreakdown'][number];

/** Pie: share of the fleet per asset category. */
export function AssetsByCategoryChart({ data }: { data: DashboardAnalytics['categoryBreakdown'] }) {
  const router = useRouter();
  const rows = useMemo(() => data.filter((c) => c.totalAssets > 0), [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets by category</CardTitle>
        <p className="text-xs text-muted">Click a slice to open that category’s assets.</p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No assets yet.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="totalAssets"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="var(--card)"
                  strokeWidth={2}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const row = (entry as { payload?: CatRow })?.payload;
                    if (row) router.push(`/assets?categoryId=${row.categoryId}`);
                  }}
                >
                  {rows.map((r, i) => (
                    <Cell key={r.categoryId} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
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
  );
}

export default AssetsByCategoryChart;
