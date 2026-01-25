export interface JwtPayload {
  email: string;
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface RequestUser {
  userId: string;
  email: string;
  role: string;
}
