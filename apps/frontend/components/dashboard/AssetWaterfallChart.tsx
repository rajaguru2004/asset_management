'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  STATUS_COLORS,
} from '@/theme';
import type { DashboardAnalytics } from '@/types/organization';

interface Row {
  name: string;
  /** invisible offset that floats the segment (waterfall) */
  base: number;
  value: number;
  fill: string;
  /** asset status to drill into, '' = unfiltered */
  drillStatus: string;
}

const NEUTRAL = '#64748b';

/**
 * Waterfall: total fleet on the left, then how it decomposes into
 * Available / Allocated / Reserved / Under maintenance / Other.
 */
export function AssetWaterfallChart({ data }: { data: DashboardAnalytics['assetsByStatus'] }) {
  const router = useRouter();

  const rows = useMemo<Row[]>(() => {
    const count = (s: string) => data.find((d) => d.status === s)?.count ?? 0;
    const segments = [
      { name: 'Available', status: 'AVAILABLE', value: count('AVAILABLE') },
      { name: 'Allocated', status: 'ALLOCATED', value: count('ALLOCATED') },
      { name: 'Reserved', status: 'RESERVED', value: count('RESERVED') },
      { name: 'Maintenance', status: 'UNDER_MAINTENANCE', value: count('UNDER_MAINTENANCE') },
      {
        name: 'Other',
        status: '',
        value: count('LOST') + count('RETIRED') + count('DISPOSED'),
      },
    ];
    const total = segments.reduce((s, x) => s + x.value, 0);
    let remaining = total;
    const out: Row[] = [
      { name: 'Total', base: 0, value: total, fill: NEUTRAL, drillStatus: '' },
    ];
    for (const seg of segments) {
      out.push({
        name: seg.name,
        base: remaining - seg.value,
        value: seg.value,
        fill: STATUS_COLORS[seg.status] ?? '#94a3b8',
        drillStatus: seg.status,
      });
      remaining -= seg.value;
    }
    return out;
  }, [data]);

  const drill = (row?: Row) => {
    if (!row) return;
    router.push(row.drillStatus ? `/assets?status=${row.drillStatus}` : '/assets');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset fleet breakdown</CardTitle>
        <p className="text-xs text-muted">Available vs allocated — click a bar to open the asset list.</p>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                cursor={{ fill: 'var(--muted-bg)', opacity: 0.5 }}
                formatter={(value, name) => (name === 'Assets' ? [value, 'Assets'] : [])}
              />
              <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} name=" " />
              <Bar
                dataKey="value"
                stackId="w"
                name="Assets"
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(entry: unknown) => drill((entry as { payload?: Row })?.payload)}
              >
                {rows.map((r) => (
                  <Cell key={r.name} fill={r.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default AssetWaterfallChart;
