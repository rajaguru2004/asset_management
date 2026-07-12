'use client';

import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Action, Resource, hasPermission } from '@/lib/permissions';

/**
 * Renders children only if the current user's role allows (resource, action).
 * UI convenience only — the server re-checks every mutation.
 */
export function PermissionGate({
  resource,
  action,
  children,
  fallback = null,
}: {
  resource: Resource;
  action: Action;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const roleId = useAuthStore((s) => s.user?.roleId);
  return hasPermission(roleId, resource, action) ? <>{children}</> : <>{fallback}</>;
}

export default PermissionGate;
