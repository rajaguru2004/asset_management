'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CalendarClock,
  Library,
  LayoutDashboard,
  Package,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Action, Resource, hasPermission, roleName } from '@/lib/permissions';
import { APP_NAME } from '@/utils/constants';
import { cn } from '@/utils/cn';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible if the user has VIEW on ANY of these resources. */
  resources: Resource[];
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, resources: [Resource.DASHBOARD] },
  {
    label: 'Organization',
    href: '/organization',
    icon: Building2,
    resources: [Resource.DEPARTMENTS, Resource.ASSET_CATEGORIES, Resource.EMPLOYEE_DIRECTORY],
  },
  { label: 'Assets', href: '/assets', icon: Package, resources: [Resource.ASSETS] },
  { label: 'Allocations', href: '/allocations', icon: ArrowLeftRight, resources: [Resource.ALLOCATIONS] },
  { label: 'Bookings', href: '/bookings', icon: CalendarClock, resources: [Resource.BOOKINGS] },
  { label: 'Maintenance', href: '/maintenance', icon: Wrench, resources: [Resource.MAINTENANCE] },
  { label: 'Library', href: '/library', icon: Library, resources: [Resource.LIBRARIES] },
];

export function AdminSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const roleId = user?.roleId;

  const visible = NAV.filter((item) =>
    item.resources.some((r) => hasPermission(roleId, r, Action.VIEW)),
  );

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 -translate-x-full flex-col border-r border-border bg-card transition-transform duration-200 lg:translate-x-0',
          open && 'translate-x-0',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <span className="block text-sm font-bold text-foreground">{APP_NAME}</span>
              <span className="block text-[11px] text-muted">Organization Setup</span>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted hover:bg-muted-bg lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visible.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:bg-muted-bg hover:text-foreground',
                )}
              >
                <Icon className="h-4.5 w-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted-bg text-xs font-semibold text-foreground">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-muted">{roleName(roleId)}</p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default AdminSidebar;
