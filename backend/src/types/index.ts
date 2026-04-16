import { Request } from 'express';

export interface JwtPayload {
  userId: number;
  email: string;
  rol: 'propietario_carlos' | 'propietario_juancruz' | 'admin';
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/** Parsea un param de ruta Express (string | string[]) a number */
export const parseId = (param: string | string[]): number =>
  parseInt(Array.isArray(param) ? param[0] : param, 10);
