import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env.WEB_API_KEY;

  // Si WEB_API_KEY no está configurada en el servidor, permitir todos los
  // requests (modo permisivo) y avisar en consola. Esto evita que el formulario
  // web quede bloqueado por falta de configuración.
  if (!expected) {
    console.warn('[apiKeyMiddleware] WEB_API_KEY no configurada — se permite el request sin validación');
    return next();
  }

  const key = req.headers['x-api-key'];
  if (!key || key !== expected) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }

  next();
};
