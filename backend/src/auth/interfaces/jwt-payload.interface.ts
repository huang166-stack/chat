export interface JwtAccessPayload {
  sub: string;
  username: string;
  role: string;
  type: 'access';
}

export interface JwtRefreshPayload {
  sub: string;
  type: 'refresh';
}