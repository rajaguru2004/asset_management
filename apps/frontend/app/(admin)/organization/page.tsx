'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Layers, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Action, Resource, hasPermission } from '@/lib/permissions';
import { Tabs, type TabItem } from '@/components/common/Tabs';
import { DepartmentsPanel } from '@/components/departments/DepartmentsPanel';
import { CategoriesPanel } from '@/components/categories/CategoriesPanel';
import { EmployeesPanel } from '@/components/employees/EmployeesPanel';

export default function OrganizationPage() {
  const router = useRouter();
  const roleId = useAuthStore((s) => s.user?.roleId);

  const tabs = useMemo<TabItem[]>(() => {
    const t: TabItem[] = [];
    if (hasPermission(roleId, Resource.DEPARTMENTS, Action.VIEW))
      t.push({ id: 'departments', label: 'Departments', icon: Building2 });
    if (hasPermission(roleId, Resource.ASSET_CATEGORIES, Action.VIEW))
      t.push({ id: 'categories', label: 'Categories', icon: Layers });
    if (hasPermission(roleId, Resource.EMPLOYEE_DIRECTORY, Action.VIEW))
      t.push({ id: 'employees', label: 'Employees', icon: Users });
    return t;
  }, [roleId]);

  const [active, setActive] = useState<string>('');

  // Pick the first permitted tab; bounce employees with no access to /403.
  useEffect(() => {
    if (roleId == null) return;
    if (tabs.length === 0) {
      router.replace('/403');
      return;
    }
    if (!tabs.some((t) => t.id === active)) setActive(tabs[0].id);
  }, [tabs, active, roleId, router]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Organization Setup</h2>
        <p className="mt-1 text-sm text-muted">
          Departments, asset categories and the employee directory — the foundation the rest of
          AssetFlow builds on.
        </p>
      </div>

      <Tabs tabs={tabs} active={active} onChange={setActive} />

      <div className="pt-1">
        {active === 'departments' && <DepartmentsPanel />}
        {active === 'categories' && <CategoriesPanel />}
        {active === 'employees' && <EmployeesPanel />}
      </div>
    </div>
  );
}
