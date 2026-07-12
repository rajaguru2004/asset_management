import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { hasPermission } from '../rbac/role-permissions';

/**
 * Global authorization guard (runs after JwtAuthGuard).
 *
 * `req.user` is populated fresh from the DB by JwtStrategy.validate() on every
 * request, so `roleId`/`isActive` here are always current — a promotion via
 * PATCH /users/:id/role is effective on the user's very next request with no
 * re-login and no cache to invalidate.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const meta = this.reflector.get(RequirePermission, ctx.getHandler());
    if (!meta) return true; // no @RequirePermission → auth-only

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as
      | { roleId?: number; isActive?: boolean }
      | undefined;

    if (!user || typeof user.roleId !== 'number') {
      throw new UnauthorizedException();
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }
    if (!hasPermission(user.roleId, meta.resource, meta.action)) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }
    return true;
  }
}
