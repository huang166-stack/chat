import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth-user.interface.js';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, context: ExecutionContext): AuthUser | AuthUser[keyof AuthUser] => {
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    return data ? request.user?.[data] : request.user;
  },
);