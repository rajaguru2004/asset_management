'use client';

import { useMemo } from 'react';
import { CheckCircle2, Package, Tags, UserCheck } from 'lucide-react';
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
import { useAssets } from '@/hooks/useAssets';
import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/Card';
import { ASSET_STATUSES } from '@/utils/constants';
import { STATUS_COLORS } from '@/theme';

export default function DashboardPage() {
  const { data: assetsData, isLoading: assetsLoading } = useAssets({
    page: 1,
    limit: 1000,
  });
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    page: 1,
    limit: 1000,
  });

  const assets = useMemo(() => assetsData?.items ?? [], [assetsData]);
  const totalAssets = assetsData?.total ?? 0;
  const totalCategories = categoriesData?.total ?? 0;
  const availableCount = assets.filter((a) => a.status === 'AVAILABLE').length;
  const assignedCount = assets.filter((a) => a.status === 'ASSIGNED').length;

  const chartData = useMemo(
    () =>
      ASSET_STATUSES.map((s) => ({
        key: s.value,
        status: s.label,
        count: assets.filter((a) => a.status === s.value).length,
      })),
    [assets]
  );

  const loading = assetsLoading || categoriesLoading;

  const stats = [
    {
      label: 'Total Assets',
      value: totalAssets,
      icon: Package,
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300',
    },
    {
      label: 'Available',
      value: availableCount,
      icon: CheckCircle2,
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    {
      label: 'Assigned',
      value: assignedCount,
      icon: UserCheck,
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    },
    {
      label: 'Categories',
      value: totalCategories,
      icon: Tags,
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted">Overview of your asset inventory</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '—' : s.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent>
          <h2 className="mb-4 text-base font-semibold text-foreground">
            Assets by Status
          </h2>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted">
              Loading chart...
            </div>
          ) : totalAssets === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted">
              <Package className="h-8 w-8 opacity-40" />
              No assets yet
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="status"
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted-bg)' }}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--foreground)',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] ?? '#6366f1'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
