export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  status?: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}
