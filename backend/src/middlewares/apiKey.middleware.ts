import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'];
  const expected = process.env.WEB_API_KEY;

  if (!expected) {
    // Si no está configurada la key, rechazar por seguridad
    return res.status(500).json({ error: 'API key no configurada en el servidor' });
  }

  if (!key || key !== expected) {
    return res.status(401).json({ error: 'API key inválida o ausente' });
  }

  next();
};
