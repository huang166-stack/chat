import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '../constants/error-codes.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { BusinessException } from '../exceptions/business.exception.js';
import type { AuthUser } from '../../auth/auth-user.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!request.user || !requiredRoles.includes(request.user.role)) {
      throw new BusinessException('无权限', ErrorCodes.FORBIDDEN, HttpStatus.FORBIDDEN);
    }

    return true;
  }
}