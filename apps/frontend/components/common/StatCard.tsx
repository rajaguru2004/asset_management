'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/utils/cn';

type Accent = 'primary' | 'success' | 'warning' | 'info';

const accents: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'primary',
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: Accent;
  hint?: string;
  onClick?: () => void;
}) {
  const animated = useCountUp(value);
  return (
    <Card
      className={cn(
        'p-5',
        onClick &&
          'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring',
      )}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {animated}
          </p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export default StatCard;
