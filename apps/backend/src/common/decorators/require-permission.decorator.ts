import { Reflector } from '@nestjs/core';
import { Resource, Action } from '../rbac/permissions.enum';

/**
 * Attach a required (resource, action) to a route handler. The global
 * PermissionsGuard reads this metadata and checks it against ROLE_PERMISSIONS.
 *
 *   @RequirePermission({ resource: Resource.DEPARTMENTS, action: Action.CREATE })
 *
 * Handlers with no decorator are auth-only (any logged-in user passes).
 */
export const RequirePermission = Reflector.createDecorator<{
  resource: Resource;
  action: Action;
}>();
