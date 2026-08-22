import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles on the route — authentication alone is sufficient.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) throw new ForbiddenException('Authentication required');

    // ADMIN role has universal access to all staff/admin routes
    if (user.role === Role.ADMIN || (user.role as string) === 'SUPER_ADMIN' || (user.role as string) === 'ORGANIZER') return true;

    // GATE role check
    const hasRole = required.some((r) => {
      if (r === Role.ADMIN) return user.role === Role.ADMIN || (user.role as string) === 'SUPER_ADMIN' || (user.role as string) === 'ORGANIZER';
      if (r === Role.GATE) return user.role === Role.GATE || (user.role as string) === 'VOLUNTEER_CHECKIN';
      if (r === Role.USER) return user.role === Role.USER || (user.role as string) === 'DELEGATE';
      return r === user.role;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Requires one of the following roles: ${required.join(', ')}`);
    }

    return true;
  }
}
