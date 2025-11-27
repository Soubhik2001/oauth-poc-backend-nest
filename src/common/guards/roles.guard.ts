import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

// This is the type of the user object attached by JwtStrategy
interface RequestUser {
  userId: number;
  email: string;
  roleName: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Changed generic type to <string[]>
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: RequestUser }>();

    if (!user) {
      console.log('[RolesGuard] Access DENIED. No user on request.');
      return false;
    }

    console.log(
      `[RolesGuard] Checking roles. User has role: '${user.roleName}'. Required: ${requiredRoles.join(', ')}`,
    );

    // Simplified comparison (string === string)
    const hasRole = requiredRoles.some((role) => user.roleName === role);

    if (!hasRole) {
      console.log(
        `[RolesGuard] Access DENIED. User role '${user.roleName}' does not match required roles.`,
      );
    }

    return hasRole;
  }
}
